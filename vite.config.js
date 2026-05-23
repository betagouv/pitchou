import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

const fastifyTarget = "http://127.0.0.1:2648";

// Route prefixes proxied to Fastify in dev. Keep in sync with scripts/server/main.js
// /data et /docs sont servis par Fastify (static registrations) car Vite ne sert que public/ et le module graph
// To be removed when switching to SvelteKit
const proxyPaths = [
  "/lien-preremplissage",
  "/envoi-email-connexion",
  "/résultats-synchronisation",
  "/api",
  "/caps",
  "/dossiers",
  "/dossier",
  "/piece-jointe-petitionnaire",
  "/especes-impactees",
  "/decision-administrative",
  "/avis-expert",
  "/prescription",
  "/prescriptions-et-contrôles",
  "/contrôle",
  "/declaration-geomce",
  "/data",
  "/docs",
];

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    strictPort: true,
    // Les clés sont matchées en string-prefix contre l'URL telle que reçue par Vite ;
    // le navigateur percent-encode les caractères non-ASCII, donc on encode les chemins.
    proxy: Object.fromEntries(
      proxyPaths.map((p) => [encodeURI(p), { target: fastifyTarget, changeOrigin: false }]),
    ),
  },
  optimizeDeps: {
    include: [
      "lunr",
      "lunr-languages/lunr.stemmer.support",
      "lunr-languages/lunr.fr",
      "page",
      "baredux",
      "remember",
    ],
  },
});
