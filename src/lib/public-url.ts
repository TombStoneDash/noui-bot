import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Guards server-side fetches of user-supplied URLs (SSRF).
 *
 * A URL is "public" when it is http(s), carries no credentials, and every
 * address its host resolves to is a public unicast address. DNS can still
 * change between this check and the fetch, so callers must also refuse to
 * follow redirects without re-checking each hop.
 */

type Lookup = (hostname: string) => Promise<{ address: string }[]>;

const defaultLookup: Lookup = (hostname) => lookup(hostname, { all: true, verbatim: true });

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, octet) => n * 256 + Number(octet), 0);
}

// [network, prefix length]
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
];

function isBlockedV4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_V4.some(([network, bits]) => {
    const size = 2 ** (32 - bits);
    const start = ipv4ToInt(network);
    return value >= start && value < start + size;
  });
}

/** Expand an IPv6 address to eight 16-bit groups. */
function ipv6Groups(ip: string): number[] {
  let address = ip.toLowerCase();
  const zone = address.indexOf("%");
  if (zone >= 0) address = address.slice(0, zone);
  // Trailing dotted IPv4 (e.g. ::ffff:127.0.0.1) becomes two groups.
  const dotted = address.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const v4 = ipv4ToInt(dotted[1]);
    address = address.slice(0, -dotted[1].length) + `${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const [head, tail] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail !== undefined && tail ? tail.split(":") : [];
  const fill = tail !== undefined ? 8 - headParts.length - tailParts.length : 0;
  return [...headParts, ...Array(fill).fill("0"), ...tailParts].map((g) => parseInt(g, 16));
}

function isBlockedV6(ip: string): boolean {
  const g = ipv6Groups(ip);
  if (g.length !== 8 || g.some((n) => Number.isNaN(n))) return true;
  const allZeroUpTo = (n: number) => g.slice(0, n).every((x) => x === 0);
  // :: and ::1
  if (allZeroUpTo(7) && (g[7] === 0 || g[7] === 1)) return true;
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d)
  if (allZeroUpTo(5) && (g[5] === 0xffff || g[5] === 0)) {
    return isBlockedV4(`${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`);
  }
  // NAT64 well-known prefix 64:ff9b::/96
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isBlockedV4(`${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`);
  }
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  return false;
}

/** True when the literal IP address is not safe to fetch from the server. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true;
}

export type PublicUrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** Validate that `input` is an http(s) URL whose host resolves only to public addresses. */
export async function checkPublicUrl(input: string, resolve: Lookup = defaultLookup): Promise<PublicUrlCheck> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "url must be an absolute http(s) URL" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "url must use http or https" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "url must not contain credentials" };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, reason: "url must point to a public host" };
  }

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await resolve(host)).map((entry) => entry.address);
    } catch {
      return { ok: false, reason: "url host could not be resolved" };
    }
  }
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    return { ok: false, reason: "url must point to a public host" };
  }
  return { ok: true, url };
}
