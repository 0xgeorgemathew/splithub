import type { NextConfig } from "next";

// Read by vinext (vite.config.ts). Module aliases live in vite.config.ts.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ["dev.splithub.space", "*.dev.splithub.space", "splithub.space", "*.splithub.space"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
