import type { MetadataRoute } from "next";

// Next.js's App Router manifest convention: this file is automatically
// served at /manifest.webmanifest and linked in the document head — no
// manual <link rel="manifest"> needed.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobMatch — Recherche d'emploi intelligente",
    short_name: "JobMatch",
    description:
      "Importez votre CV, laissez l'IA construire votre profil, et trouvez les offres qui vous correspondent vraiment.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7fa",
    theme_color: "#3866e3",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
