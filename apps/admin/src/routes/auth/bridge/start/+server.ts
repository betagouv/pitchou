import { error, redirect } from "@sveltejs/kit";
import { brokerClient, verifyRequest } from "#lib/server/loginBridge.ts";
import { getBaseUrl } from "#lib/server/env.ts";
import { randomToken, buildAuthorizationUrl } from "#lib/server/proconnect.ts";
import { setTransaction } from "#lib/server/session.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies, setHeaders }) => {
  setHeaders({ "cache-control": "no-store", "referrer-policy": "no-referrer" });
  const request = url.searchParams.get("request");
  let bridge;
  try {
    if (!request || request.length > 2048) throw new Error("Invalid request size.");
    bridge = await verifyRequest(
      brokerClient(url.searchParams.get("client") ?? ""),
      getBaseUrl(),
      request,
    );
  } catch {
    error(400, "Demande de connexion invalide ou expirée. Revenez à l'application de départ.");
  }
  const state = randomToken();
  const nonce = randomToken();
  await setTransaction(cookies, { state, nonce, redirectTo: "/", bridge });
  redirect(302, await buildAuthorizationUrl(state, nonce), { external: true });
};
