import adapter from "@sveltejs/adapter-node";
import { getRequest } from "@sveltejs/kit/node";
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

export default defineConfig(({ command, isPreview }) => {
  const devOrigin =
    command === "serve" && !isPreview ? process.env.PUBLIC_SITE_URL_ADMIN || undefined : undefined;
  const origin =
    resolveAppOrigin("admin", process.env) ?? (devOrigin ? new URL(devOrigin).origin : undefined);
  const nodeAdapter = adapter();
  if (origin) {
    // Vite receives HTTP from the local TLS proxy. Keep Request and event.url on the public origin.
    nodeAdapter.vite = {
      ...nodeAdapter.vite,
      getRequest: (options) => getRequest({ ...options, base: origin }),
    };
  }

  return {
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
        adapter: nodeAdapter,
        paths: { origin },
        preprocess: vitePreprocess(),
        tracing: { server: true },
      }),
    ],
    server: {
      host: "127.0.0.1",
      allowedHosts: origin ? [new URL(origin).hostname] : [],
      port: 5174,
      strictPort: true,
    },
    optimizeDeps: {
      exclude: ["maplibre-gl"],
    },
    ssr: {
      external: ["knex", "pg"],
    },
  };
});
