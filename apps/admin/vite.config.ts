import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { sentrySvelteKit } from "@sentry/sveltekit";

// The app runs with CWD = this folder (apps/admin); the .env lives at the repo root.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

// Upload source maps to Sentry only when an auth token is configured (build-time only).
// sentrySvelteKit() MUST come before sveltekit() in the plugins array.
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
  ? [
      sentrySvelteKit({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT_ADMIN,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ]
  : [];

export default defineConfig({
  plugins: [...sentryPlugins, sveltekit()],
  server: {
    port: 5174,
    strictPort: true,
  },
  ssr: {
    external: ["knex", "pg"],
  },
});
