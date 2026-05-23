import type { Handle } from "@sveltejs/kit";
import { miseEnPlaceSecretGeoMCE } from "$server/database/capability-geomce.js";

if (!process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN) {
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`);
}
if (!process.env.SITE_URL_PITCHOU) {
  throw new TypeError(`Variable d'environnement SITE_URL_PITCHOU manquante`);
}

console.log("NODE_ENV", process.env.NODE_ENV);

await miseEnPlaceSecretGeoMCE();

export const handle: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);
  console.log(
    `${event.request.method} ${event.url.pathname} ${response.status} ${Date.now() - start}ms`,
  );
  return response;
};
