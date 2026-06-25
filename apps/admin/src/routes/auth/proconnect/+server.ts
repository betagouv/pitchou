import { error, redirect } from "@sveltejs/kit";

import { randomToken, buildAuthorizationUrl } from "$lib/server/proconnect.ts";
import { sanitizeInternalPath } from "$lib/server/redirect.ts";
import { setTransaction } from "$lib/server/session.ts";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const redirectTo = sanitizeInternalPath(url.searchParams.get("redirectTo"));
  const state = randomToken();
  const nonce = randomToken();

  let authorizationUrl: string;
  try {
    await setTransaction(cookies, { state, nonce, redirectTo });
    authorizationUrl = await buildAuthorizationUrl(state, nonce);
  } catch (err) {
    console.error("ProConnect authorization start failed", err);
    error(
      502,
      "La connexion ProConnect est momentanément indisponible. Réessayez dans quelques instants.",
    );
  }

  redirect(302, authorizationUrl);
};
