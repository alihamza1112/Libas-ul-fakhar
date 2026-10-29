import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server in .next/standalone, used by the Docker image
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Only our own paths may be optimised (resized + WebP/AVIF on the fly).
    localPatterns: [
      { pathname: "/media/products/**", search: "" },
      { pathname: "/brand/**", search: "" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // product photo URLs are immutable
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
