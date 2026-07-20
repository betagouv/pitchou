import type { Handle } from "@sveltejs/kit";
import { setupSecretGeoMCE } from "@pitchou/server/database/capability_geomce.ts";
import { sequence } from "@sveltejs/kit/hooks";
import * as Sentry from "@sentry/sveltekit";
if (!process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN) {
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`);
}
if (!process.env.PUBLIC_SITE_URL_PITCHOU) {
  throw new TypeError(`Variable d'environnement PUBLIC_SITE_URL_PITCHOU manquante`);
}

console.log("NODE_ENV", process.env.NODE_ENV);

// fire-and-forget
setupSecretGeoMCE().catch((err) => {
  console.error("setupSecretGeoMCE failed:", err);
});

const STATIC_PREFIXES = ["/_app/", "/docs/", "/data/"];

const requestLogger: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);

  const path = event.url.pathname;
  const isStatic = STATIC_PREFIXES.some((p) => path.startsWith(p));

  if (!isStatic) {
    console.log(`${event.request.method} ${path} ${response.status} ${Date.now() - start}ms`);
  }

  return response;
};

export const handleError = Sentry.handleErrorWithSentry();

export const handle = sequence(Sentry.sentryHandle(), requestLogger);
