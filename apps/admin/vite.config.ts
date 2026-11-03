import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { sentrySvelteKit } from "@sentry/sveltekit";
import tailwindcss from "@tailwindcss/vite";
import { resolveAppOrigin } from "@pitchou/server/requestOrigin.ts";

// The app runs with CWD = this folder (apps/admin); the .env lives at the repo root.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

const origin = resolveAppOrigin("admin", process.env);

export default defineConfig({
  define: { __PITCHOU_ORIGIN__: JSON.stringify(origin ?? null) },
  plugins: [
    sentrySvelteKit({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_ADMIN,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      adapter: "node",
    }),
    tailwindcss(),
    sveltekit({
      adapter: adapter(),
      paths: { origin },
      preprocess: vitePreprocess(),
      tracing: { server: true },
    }),
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
