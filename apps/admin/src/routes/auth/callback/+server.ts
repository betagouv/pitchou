import { error, redirect } from "@sveltejs/kit";
import { isAdminEmail } from "@pitchou/server/admin.ts";
import { createSession } from "@pitchou/server/session.ts";

import { exchangeCodeAndFetchUser } from "$lib/server/proconnect.ts";
import { readTransaction, clearTransaction, setSessionCookie } from "$lib/server/session.ts";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const tx = await readTransaction(cookies);
  clearTransaction(cookies);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!tx || !code || !state || state !== tx.state) {
    error(400, "Échec de l'authentification ProConnect (état invalide ou expiré).");
  }

  let user;
  try {
    user = await exchangeCodeAndFetchUser(code, tx.nonce);
  } catch (err) {
    console.error("ProConnect callback failed", err);
    error(502, "Échec de l'authentification ProConnect.");
  }

  // Create the session for any authenticated user, so it can be reused by the other
  // Pitchou apps; the admin app then applies its own authorization below.
  const token = await createSession({ email: user.email, name: user.name, idToken: user.idToken });
  setSessionCookie(cookies, token);

  if (!isAdminEmail(user.email)) {
    redirect(303, "/auth/acces-refuse");
  }

  redirect(303, tx.redirectTo || "/");
};
