import type { Cookies } from "@sveltejs/kit";
import type { ProConnectUser } from "@pitchou/server/proconnect.ts";
import { getBaseUrl } from "./env.ts";
import { sanitizeInternalPath } from "./redirect.ts";
import {
  BRIDGE_CALLBACK,
  BRIDGE_START,
  brokerClient,
  localBridgeClient,
} from "./loginBridge/config.ts";
import type { BridgeTransaction } from "./loginBridge/config.ts";
import { createHandoff, createRequest, randomValue, verifyHandoff } from "./loginBridge/tokens.ts";
import { setBrowserTransaction, takeBrowserTransaction } from "./loginBridge/cookie.ts";
export { brokerClient } from "./loginBridge/config.ts";
export { verifyRequest } from "./loginBridge/tokens.ts";
export type { BridgeTransaction } from "./loginBridge/config.ts";

export async function beginBridgeLogin(cookies: Cookies, redirectTo: string) {
  const client = localBridgeClient();
  if (!client) return null;
  const state = randomValue();
  const verifier = randomValue();
  const request = await createRequest(client, client.broker, state, verifier);
  await setBrowserTransaction(cookies, { state, verifier, redirectTo });
  const url = new URL(BRIDGE_START, client.broker);
  url.search = new URLSearchParams({ client: client.id, request }).toString();
  return url.href;
}

export async function finishBridgeLogin(tx: BridgeTransaction, user: ProConnectUser) {
  const client = brokerClient(tx.client);
  const ticket = await createHandoff(client, getBaseUrl(), tx, user);
  const url = new URL(BRIDGE_CALLBACK, client.origin);
  url.search = new URLSearchParams({ ticket, state: tx.state }).toString();
  return url.href;
}

export async function receiveBridgeLogin(cookies: Cookies, url: URL) {
  const client = localBridgeClient();
  const tx = await takeBrowserTransaction(cookies);
  const ticket = url.searchParams.get("ticket");
  if (
    !client ||
    !tx ||
    !ticket ||
    ticket.length > 8192 ||
    url.searchParams.get("state") !== tx.state
  )
    throw new Error("Missing or invalid login transaction.");
  return {
    ...(await verifyHandoff(client, client.broker, ticket, tx.state, tx.verifier)),
    redirectTo: sanitizeInternalPath(tx.redirectTo),
  };
}
