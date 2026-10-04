export const DENYLIST_PROVIDER_IDS: readonly string[] = [
  "b0771337-b070-4000-a000-000000000001",
];

export type ProviderLike = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  endpoint_url?: string | null;
  api_key_hash?: string | null;
  api_key_prefix?: string | null;
};

export function isTestArtifactProvider(p: ProviderLike | null | undefined): boolean {
  if (!p) return true;
  if (p.id && DENYLIST_PROVIDER_IDS.includes(p.id)) return true;
  if (p.api_key_hash?.startsWith("seed_placeholder")) return true;
  if (p.api_key_prefix?.startsWith("bz_seed")) return true;
  if (/^(test|testing|demo|dummy|sample|example)\b/i.test(p.name || "")) return true;
  if (/\btest[-_ ]?(provider|server|artifact)\b/i.test(p.name || "")) return true;
  if (/@(example\.com|example\.org|test\.com)$/i.test(p.email || "")) return true;

  if (p.endpoint_url) {
    try {
      const host = new URL(p.endpoint_url).hostname;
      if (host === "localhost" || host === "127.0.0.1" || /\.(example\.com|local|test)$/.test(host)) {
        return true;
      }
    } catch {
      // A malformed endpoint alone is not an artifact signal.
    }
  }
  return false;
}

type CatalogRow = { bazaar_providers?: ProviderLike | null };

export function filterCatalogRows<T>(rows: T[]): T[] {
  return rows.filter((row) => !isTestArtifactProvider((row as CatalogRow).bazaar_providers));
}

export function countRealProviders(rows: unknown[]): number {
  const ids = new Set<string>();
  for (const row of filterCatalogRows(rows)) {
    const id = (row as CatalogRow).bazaar_providers?.id;
    if (id) ids.add(id);
  }
  return ids.size;
}
