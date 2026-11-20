import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nordhem Furnishing Store",
    short_name: "Nordhem",
    description: "Affordable furniture and home furnishing — an independent educational re-creation of ikea.com/sg.",
    display: "standalone",
    start_url: "/",
    background_color: "#ffffff",
    theme_color: "#0058a3",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
