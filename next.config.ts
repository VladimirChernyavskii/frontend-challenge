import type { NextConfig } from "next";
import { normalizeBasePath } from "./lib/basePath";

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/thecat-cdn/:path*",
        destination: "https://cdn2.thecatapi.com/:path*",
      },
      {
        source: "/thecat-cdn-legacy/:path*",
        destination: "https://cdn.thecatapi.com/:path*",
      },
    ];
  },
};

export default nextConfig;
