import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Foliq",
    short_name: "Foliq",
    description:
      "Personal finance tracker for wallets, daily cashflow, transfers, and monthly category budgets.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F6F8",
    theme_color: "#1D4ED8",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
