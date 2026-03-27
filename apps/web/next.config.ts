import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dentiqa/shared", "@dentiqa/ui"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
