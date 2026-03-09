import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
