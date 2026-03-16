import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dentalflow/shared", "@dentalflow/ui"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:3001/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
