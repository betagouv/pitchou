import { redirect } from "@sveltejs/kit";

import { deleteSession } from "@pitchou/server/session.ts";

import { randomToken, buildLogoutUrl } from "$lib/server/proconnect.ts";
import { readSessionToken, clearSessionCookie } from "$lib/server/session.ts";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies }) => {
  const token = readSessionToken(cookies);
  const idToken = token ? await deleteSession(token) : null;
  clearSessionCookie(cookies);

  // Also end the ProConnect session so the next login isn't silently reconnected.
  // If ProConnect is unreachable, our local session is already cleared, so fall back gracefully.
  let logoutUrl = "/auth/login";
  if (idToken) {
    try {
      logoutUrl = await buildLogoutUrl(idToken, randomToken());
    } catch (err) {
      console.error("ProConnect logout URL build failed", err);
    }
  }

  redirect(302, logoutUrl);
};
