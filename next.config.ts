import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during builds for faster iteration
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during builds for faster iteration
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
