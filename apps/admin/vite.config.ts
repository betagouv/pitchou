import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// The app runs with CWD = this folder (apps/admin); the .env lives at the repo root.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5174,
    strictPort: true,
  },
});
