import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

process.loadEnvFile?.(".env");

const fastifyTarget = "http://127.0.0.1:2648";

// Remaining paths still served by Fastify during the migration
// `^/dossier(/|$)` is a regex (Vite treats keys starting with ^ as regex) to
// match /dossier and /dossier/* but NOT /dossiers since Kit owns /dossiers/*
const proxyPaths = ["^/dossier(/|$)", "/data", "/docs"];

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(
      proxyPaths.map((p) => [p, { target: fastifyTarget, changeOrigin: false }]),
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
