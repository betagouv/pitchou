import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { sentrySvelteKit } from "@sentry/sveltekit";
import tailwindcss from "@tailwindcss/vite";

// The app runs with CWD = this folder (apps/admin); the .env lives at the repo root.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_ADMIN,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      adapter: "node",
    }),
    tailwindcss(),
    sveltekit(),
  ],
  server: {
    port: 5174,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  ssr: {
    external: ["knex", "pg"],
  },
});
