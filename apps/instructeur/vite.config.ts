import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { sentrySvelteKit } from "@sentry/sveltekit";
import tailwindcss from "@tailwindcss/vite";
import { fleetNotifications } from "./preview/notificationPlugin.ts";

// The app runs with CWD = this folder (apps/instructeur); the .env lives at the repo root.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

export default defineConfig({
  plugins: [
    fleetNotifications(),
    sentrySvelteKit({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_INSTRUCTEUR,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      adapter: "node",
    }),
    tailwindcss(),
    sveltekit({
      adapter: adapter(),
      paths: { origin: process.env.ORIGIN || undefined },
      preprocess: vitePreprocess(),
      tracing: { server: true },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ["lunr", "lunr-languages/lunr.stemmer.support", "lunr-languages/lunr.fr"],
    // MapLibre v6's worker entry is lost when Vite pre-bundles the package.
    exclude: ["maplibre-gl"],
  },
  ssr: {
    external: ["knex", "pg", "@aws-sdk/client-s3"],
  },
});
