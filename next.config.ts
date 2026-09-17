import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.ytimg.com", pathname: "/vi/**" }, { protocol: "https", hostname: "*.ytimg.com", pathname: "/vi_webp/**" }] },
};

export default nextConfig;
