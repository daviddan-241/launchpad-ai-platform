import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeadForge",
    short_name: "LeadForge",
    description: "Mobile-first AI sales workspace",
    start_url: "/chat",
    display: "standalone",
    background_color: "#0b0610",
    theme_color: "#0b0610",
    icons: [
      {
        src: "/leadforge-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
