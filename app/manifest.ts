import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Penny · Cash Flow", short_name: "Penny", description: "Make your salary last until payday.",
    start_url: "/dashboard", display: "standalone", background_color: "#fff4c2", theme_color: "#fbbf24",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
