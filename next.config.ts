import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb", // Increased from 50mb to 100mb for video uploads
    },
  },
};

export default nextConfig;
