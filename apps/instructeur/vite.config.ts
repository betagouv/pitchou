import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// L'app tourne avec un CWD = ce dossier (apps/instructeur) ; le .env vit à la racine du repo.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ["lunr", "lunr-languages/lunr.stemmer.support", "lunr-languages/lunr.fr", "remember"],
  },
});
