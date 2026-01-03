import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  typescript: {
    // Temporarily ignore TypeScript errors during builds for faster iteration
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
