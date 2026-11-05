import { getBaseUrl, requireEnv } from "../env.ts";

export type BridgeClient = { id: string; origin: string; secret: string };
export type BridgeTransaction = { client: string; state: string; challenge: string };
export const BRIDGE_CALLBACK = "/auth/bridge/callback";
export const BRIDGE_START = "/auth/bridge/start";

export function httpsOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value || url.username || url.password)
    throw new Error("Login bridge requires an exact HTTPS origin.");
  return value;
}

export function validateClient(value: BridgeClient): BridgeClient {
  if (!/^[a-z0-9-]{1,40}$/u.test(value.id) || !/^[a-f0-9]{64}$/u.test(value.secret))
    throw new Error("Invalid login bridge client configuration.");
  httpsOrigin(value.origin);
  return value;
}

export function localBridgeClient(): (BridgeClient & { broker: string }) | null {
  if (!process.env.AUTH_BRIDGE_ORIGIN) return null;
  if (!["workspace", "rehearsal"].includes(process.env.ONAGRE_DEPLOYMENT_ROLE ?? ""))
    throw new Error("Login bridge clients are restricted to Onagre deployments.");
  return {
    ...validateClient({
      id: requireEnv("AUTH_BRIDGE_CLIENT_ID"),
      origin: httpsOrigin(getBaseUrl()),
      secret: requireEnv("AUTH_BRIDGE_SECRET"),
    }),
    broker: httpsOrigin(requireEnv("AUTH_BRIDGE_ORIGIN")),
  };
}

export function brokerClient(id: string): BridgeClient {
  if (process.env.AUTH_BRIDGE_ENABLED !== "true" || process.env.AUTH_BRIDGE_ORIGIN)
    throw new Error("Login bridge issuer is disabled.");
  httpsOrigin(getBaseUrl());
  const values: BridgeClient[] = JSON.parse(requireEnv("AUTH_BRIDGE_CLIENTS"));
  if (!Array.isArray(values) || values.length > 10) throw new Error("Invalid bridge clients.");
  const clients = values.map(validateClient);
  if (new Set(clients.map((client) => client.id)).size !== clients.length)
    throw new Error("Duplicate bridge client.");
  const client = clients.find((entry) => entry.id === id);
  if (!client) throw new Error("Unknown bridge client.");
  return client;
}
