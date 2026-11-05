import type { Cookies } from "@sveltejs/kit";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  beginBridgeLogin,
  finishBridgeLogin,
  receiveBridgeLogin,
  verifyRequest,
  brokerClient,
} from "./loginBridge.ts";
import { takeBrowserTransaction } from "./loginBridge/cookie.ts";
import { localBridgeClient } from "./loginBridge/config.ts";

const broker = "https://staging.admin.example.fr";
const client = { id: "workspace", origin: "https://onagre.example.fr", secret: "ab".repeat(32) };
function cookies() {
  const store = new Map<string, string>();
  return {
    store,
    jar: {
      get: (key: string) => store.get(key),
      set: vi.fn((key: string, value: string) => store.set(key, value)),
      delete: vi.fn((key: string) => store.delete(key)),
    } as unknown as Cookies,
  };
}
function useClient() {
  vi.stubEnv("ONAGRE_DEPLOYMENT_ROLE", "workspace");
  vi.stubEnv("AUTH_BRIDGE_ORIGIN", broker);
  vi.stubEnv("AUTH_BRIDGE_CLIENT_ID", client.id);
  vi.stubEnv("AUTH_BRIDGE_SECRET", client.secret);
  vi.stubEnv("PUBLIC_SITE_URL_ADMIN", client.origin);
}
function useBroker() {
  vi.stubEnv("AUTH_BRIDGE_ORIGIN", "");
  vi.stubEnv("AUTH_BRIDGE_ENABLED", "true");
  vi.stubEnv("AUTH_BRIDGE_CLIENTS", JSON.stringify([client]));
  vi.stubEnv("PUBLIC_SITE_URL_ADMIN", broker);
}
beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "cookie-signing-key");
  vi.stubEnv("AUTH_BRIDGE_ORIGIN", "");
  vi.stubEnv("AUTH_BRIDGE_ENABLED", "");
});
afterEach(() => vi.unstubAllEnvs());

test("normal login stays local with no bridge configured", async () => {
  const { jar } = cookies();
  expect(await beginBridgeLogin(jar, "/dossiers")).toBeNull();
  expect(jar.set).not.toHaveBeenCalled();
});

test("complete handoff preserves the destination and requires the initiating host-only cookie", async () => {
  useClient();
  const { jar } = cookies();
  const start = new URL((await beginBridgeLogin(jar, "/onagre?tab=dump"))!);
  expect(start.origin).toBe(broker);
  expect(jar.set).toHaveBeenCalledWith("__Host-pitchou_login_bridge", expect.any(String), {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
  });
  useBroker();
  const tx = await verifyRequest(
    brokerClient(client.id),
    broker,
    start.searchParams.get("request")!,
  );
  const callback = new URL(
    await finishBridgeLogin(tx, {
      issuer: "https://proconnect.example.fr",
      subject: "subject",
      email: "team@example.fr",
      firstNames: "Test",
      lastName: "User",
      name: "Test User",
      idToken: "private",
    }),
  );
  expect(callback.origin).toBe(client.origin);
  useClient();
  await expect(receiveBridgeLogin(cookies().jar, callback)).rejects.toThrow();
  const handoff = await receiveBridgeLogin(jar, callback);
  expect(handoff.redirectTo).toBe("/onagre?tab=dump");
  expect(handoff.identity.email).toBe("team@example.fr");
  await expect(receiveBridgeLogin(jar, callback)).rejects.toThrow();
});

test("unknown clients, insecure origins and an incorrect deployment role fail closed", () => {
  expect(() => brokerClient(client.id)).toThrow();
  useBroker();
  expect(() => brokerClient("unregistered")).toThrow();
  useClient();
  vi.stubEnv("AUTH_BRIDGE_ORIGIN", "http://staging.admin.example.fr");
  expect(() => localBridgeClient()).toThrow();
  vi.stubEnv("AUTH_BRIDGE_ORIGIN", broker);
  vi.stubEnv("ONAGRE_DEPLOYMENT_ROLE", "");
  expect(() => localBridgeClient()).toThrow();
});

test("a tampered browser cookie is rejected and cleared", async () => {
  useClient();
  const { jar, store } = cookies();
  await beginBridgeLogin(jar, "/");
  for (const [key, value] of store) store.set(key, value + "changed");
  expect(await takeBrowserTransaction(jar)).toBeNull();
  expect(store.size).toBe(0);
});
