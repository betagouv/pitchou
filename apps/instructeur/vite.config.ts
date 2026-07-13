import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { sentrySvelteKit } from "@sentry/sveltekit";

// The app runs with CWD = this folder (apps/instructeur); the .env lives at the repo root.
try {
  process.loadEnvFile?.("../../.env");
} catch {}

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_INSTRUCTEUR,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      adapter: "node",
    }),
    sveltekit(),
  ],
  // @sentry/sveltekit pulls @opentelemetry/api into the graph, which forks
  // @sveltejs/kit into two physical installs. Deduping keeps a single copy so
  // `error()`'s HttpError stays `instanceof HttpError` — otherwise expected 404s
  // are mis-handled as fatal 500s and reported to Sentry.
  resolve: {
    dedupe: ["@sveltejs/kit"],
  },
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
