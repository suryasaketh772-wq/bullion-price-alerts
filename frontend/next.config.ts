import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Dev-only: allows LAN access from mobile on same WiFi. Ignored in production builds.
  allowedDevOrigins: ["192.168.0.149"],
};

export default nextConfig;
