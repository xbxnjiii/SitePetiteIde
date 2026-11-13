import type { MetadataRoute } from "next";

// Rend le site installable comme une application (écran d'accueil du téléphone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La Petite IDE",
    short_name: "Petite IDE",
    description: "Quiz et fiches mémo pour étudiants infirmiers.",
    start_url: "/quiz?source=appli",
    scope: "/",
    display: "standalone",
    background_color: "#F8F9FC",
    theme_color: "#4E7AC7",
    lang: "fr",
    icons: [
      { src: "/img/app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/img/app-512.png", sizes: "512x512", type: "image/png" },
      { src: "/img/app-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Quiz", url: "/quiz" },
      { name: "Le grand mix", url: "/quiz/grand-mix?mode=flash" },
    ],
  };
}
