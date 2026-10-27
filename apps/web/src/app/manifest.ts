import type { MetadataRoute } from "next";

import { APP_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    id: "/",
    start_url: "/",
    scope: "/",
    orientation: "any",
    categories: ["entertainment"],
    display: "standalone",
    background_color: "#0b0a12",
    theme_color: "#0b0a12",
    // The crescent sits inside the central 80% of both icons, so they also work as maskable.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
