import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Libas-ul-Fakhar",
    short_name: "Libas-ul-Fakhar",
    description: "Modern heritage clothing, worn with pride.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#111111",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
