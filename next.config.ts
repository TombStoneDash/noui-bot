import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // forthebots.io → noui.bot (301 permanent redirect)
      {
        source: "/:path*",
        has: [{ type: "host", value: "forthebots.io" }],
        destination: "https://noui.bot/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.forthebots.io" }],
        destination: "https://noui.bot/:path*",
        permanent: true,
      },
      // Internal redirects
      {
        source: "/bazaar",
        destination: "/marketplace",
        permanent: true,
      },
      {
        source: "/humans.txt",
        destination: "/.well-known/humans.txt",
        permanent: true,
      },
      {
        source: "/health",
        destination: "/api/health",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
