import { error, redirect } from "@sveltejs/kit";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { receiveBridgeLogin } from "#lib/server/loginBridge.ts";
import { acceptHandoff } from "#lib/server/loginBridge/accept.ts";
import { setSessionCookie } from "#lib/server/session.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies, setHeaders }) => {
  setHeaders({ "cache-control": "no-store", "referrer-policy": "no-referrer" });
  let token;
  let redirectTo;
  try {
    const handoff = await receiveBridgeLogin(cookies, url);
    redirectTo = handoff.redirectTo;
    token = await acceptHandoff(db, handoff);
  } catch {
    error(
      400,
      "Connexion invalide, expirée ou déjà utilisée. Recommencez depuis cette application.",
    );
  }
  if (!token) redirect(303, "/auth/acces-refuse");
  setSessionCookie(cookies, token);
  redirect(303, redirectTo);
};
