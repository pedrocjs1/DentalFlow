import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dentalflow/shared", "@dentalflow/ui"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
