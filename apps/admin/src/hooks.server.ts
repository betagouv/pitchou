import { sequence } from "@sveltejs/kit/hooks";
import { redirect, type Handle } from "@sveltejs/kit";
import * as Sentry from "@sentry/sveltekit";

import { isAdminEmail } from "@pitchou/server/admin.ts";
import { readSession } from "@pitchou/server/session.ts";

import { readSessionToken, setSessionCookie } from "$lib/server/session.ts";

export const handleError = Sentry.handleErrorWithSentry();

// Public assets served without authentication; /docs/* carries the shared DSFR
// styles/scripts, so the login wall can be rendered.
const ASSET_PREFIXES = ["/docs/", "/_app/", "/favicon"];

const authenticate: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return resolve(event);
  }

  const token = readSessionToken(event.cookies);
  const session = token ? await readSession(token) : null;
  event.locals.user = session ? { email: session.email, name: session.nom } : null;
  // Re-set the cookie so its lifetime slides along with the session row.
  if (token && session) setSessionCookie(event.cookies, token);

  // The login flow itself stays reachable without a session.
  if (pathname.startsWith("/auth/")) {
    return resolve(event);
  }

  const isApi = pathname.startsWith("/api/");

  if (!event.locals.user) {
    if (isApi) return new Response("Authentification requise", { status: 401 });
    const redirectTo = pathname + event.url.search;
    redirect(302, `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (!isAdminEmail(event.locals.user.email)) {
    if (isApi) return new Response("Accès refusé", { status: 403 });
    redirect(302, "/auth/acces-refuse");
  }

  return resolve(event);
};

export const handle = sequence(Sentry.sentryHandle(), authenticate);
