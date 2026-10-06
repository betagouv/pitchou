import { readSession } from "@pitchou/server/session.ts";
import { readSessionToken, setSessionCookie } from "$lib/server/session.ts";
import type { Handle } from "@sveltejs/kit";
import { setupSecretGeoMCE } from "@pitchou/server/database/capability_geomce.ts";
import { sequence } from "@sveltejs/kit/hooks";
import * as Sentry from "@sentry/sveltekit";
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

const authenticate: Handle = async ({ event, resolve }) => {
  const token = readSessionToken(event.cookies);
  const session = token ? await readSession(token) : null;
  event.locals.user = session ? (({ idToken, ...user }) => user)(session) : null;
  if (token && session) setSessionCookie(event.cookies, token);
  const path = event.url.pathname;
  const publicRoute =
    path.startsWith("/auth/") ||
    STATIC_PREFIXES.some((p) => path.startsWith(p)) ||
    [
      "/",
      "/connexion",
      "/referentiel-type-impact",
      "/saisie-especes",
      "/preremplissage-derogation",
      "/taxref",
      "/especes-protegees",
      "/bdc-statuts",
      "/stats",
      "/plan-du-site",
      "/accessibilite",
      "/donnees-personnelles",
      "/declaration-accessibilite",
      "/mentions-legales",
      "/politique-confidentialite",
      "/resultats-synchronisation",
      "/declaration-geomce",
      "/api/webhooks/brevo",
      "/api/stats-publiques",
      "/api/aarri",
      "/api/changelog",
    ].includes(path) ||
    path === "/nouveautes" ||
    path.startsWith("/nouveautes/") ||
    path.startsWith("/changelog-media/") ||
    path.startsWith("/favicon") ||
    [
      "/api/activites",
      "/api/especes-protegees",
      "/api/taxref",
      "/api/bdc-statuts",
      "/api/referentiel-type-impact-methode-moyen-de-poursuite",
    ].some((p) => path === p || path.startsWith(p + "/"));
  if (publicRoute) return resolve(event);
  if (!session) {
    if (event.request.headers.get("accept")?.includes("text/html"))
      return new Response(null, {
        status: 303,
        headers: {
          location: "/auth/login?redirectTo=" + encodeURIComponent(path + event.url.search),
        },
      });
    return new Response("Authentification requise", { status: 401 });
  }
  if (
    path !== "/api/session" &&
    (!session.groupes.length || !session.permissions.includes("dossier:read"))
  ) {
    if (
      ["GET", "HEAD"].includes(event.request.method) &&
      event.request.headers.get("accept")?.includes("text/html")
    )
      return new Response(null, { status: 303, headers: { location: "/auth/acces-refuse" } });
    return new Response("Accès aux dossiers non autorisé", { status: 403 });
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(event.request.method)) {
    if (event.request.headers.get("origin") !== event.url.origin)
      return new Response("Origine de la requête refusée", { status: 403 });
    if (!path.startsWith("/api/metriques/") && !session.permissions.includes("dossier:instruct"))
      return new Response("Permission d'instruction requise", { status: 403 });
  }
  return resolve(event);
};
export const handle = sequence(Sentry.sentryHandle(), requestLogger, authenticate);
