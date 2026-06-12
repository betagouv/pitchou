import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// The app runs with CWD = this folder (apps/instructeur); the .env lives at the repo root.
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
  ssr: {
    external: ["knex", "pg", "@aws-sdk/client-s3"],
  },
});
