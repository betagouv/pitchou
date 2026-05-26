import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

try {
  process.loadEnvFile?.(".env");
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
