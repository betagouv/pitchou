import type { Handle } from "@sveltejs/kit";
import { miseEnPlaceSecretGeoMCE } from "$server/database/capability-geomce.ts";

if (!process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN) {
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`);
}
if (!process.env.SITE_URL_PITCHOU) {
  throw new TypeError(`Variable d'environnement SITE_URL_PITCHOU manquante`);
}

console.log("NODE_ENV", process.env.NODE_ENV);

// fire-and-forget
miseEnPlaceSecretGeoMCE().catch((err) => {
  console.error("miseEnPlaceSecretGeoMCE failed:", err);
});

const STATIC_PREFIXES = ["/_app/", "/docs/", "/data/"];

export const handle: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);
  const path = event.url.pathname;
  const isStatic = STATIC_PREFIXES.some((p) => path.startsWith(p));
  if (!isStatic) {
    console.log(`${event.request.method} ${path} ${response.status} ${Date.now() - start}ms`);
  }
  return response;
};
