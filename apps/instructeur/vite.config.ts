import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { sentrySvelteKit } from "@sentry/sveltekit";

// The app runs with CWD = this folder (apps/instructeur); the .env lives at the repo root.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

// Upload source maps to Sentry only when an auth token is configured (build-time only).
// sentrySvelteKit() MUST come before sveltekit() in the plugins array.
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
  ? [
      sentrySvelteKit({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT_INSTRUCTEUR,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ]
  : [];

export default defineConfig({
  plugins: [...sentryPlugins, sveltekit()],
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
