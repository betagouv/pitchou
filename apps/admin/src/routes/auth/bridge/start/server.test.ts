import type { RequestEvent } from "@sveltejs/kit";
import { beforeEach, expect, test, vi } from "vitest";
import { brokerClient, verifyRequest } from "#lib/server/loginBridge.ts";
import { setTransaction } from "#lib/server/session.ts";
import { GET } from "./+server.ts";

vi.mock("#lib/server/loginBridge.ts", () => ({ brokerClient: vi.fn(), verifyRequest: vi.fn() }));
vi.mock("#lib/server/env.ts", () => ({ getBaseUrl: () => "https://broker.example.fr" }));
vi.mock("#lib/server/proconnect.ts", () => ({
  randomToken: () => "random-oauth-value",
  buildAuthorizationUrl: () => "https://proconnect.example.fr/authorize",
}));
vi.mock("#lib/server/session.ts", () => ({ setTransaction: vi.fn() }));
const event = (search = "?client=workspace&request=signed-request") =>
  ({
    url: new URL("https://broker.example.fr/auth/bridge/start" + search),
    cookies: {},
    setHeaders: vi.fn(),
  }) as unknown as RequestEvent<Record<string, never>, "/auth/bridge/start">;
beforeEach(() => vi.resetAllMocks());

test("verified request is carried in the broker OAuth cookie", async () => {
  const tx = { client: "workspace", state: "browser-state", challenge: "browser-challenge" };
  vi.mocked(verifyRequest).mockResolvedValue(tx);
  const req = event();
  await expect(GET(req)).rejects.toMatchObject({
    status: 302,
    location: "https://proconnect.example.fr/authorize",
  });
  expect(setTransaction).toHaveBeenCalledWith(req.cookies, {
    state: "random-oauth-value",
    nonce: "random-oauth-value",
    redirectTo: "/",
    bridge: tx,
  });
  expect(req.setHeaders).toHaveBeenCalledWith({
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  });
});

test("unregistered clients, invalid signatures and oversized requests do not start OAuth", async () => {
  vi.mocked(brokerClient).mockImplementation(() => {
    throw new Error("Unknown client");
  });
  await expect(GET(event())).rejects.toMatchObject({ status: 400 });
  vi.mocked(brokerClient).mockReturnValue({
    id: "workspace",
    origin: "https://onagre.example.fr",
    secret: "ab".repeat(32),
  });
  vi.mocked(verifyRequest).mockRejectedValue(new Error("Invalid signature"));
  await expect(GET(event())).rejects.toMatchObject({ status: 400 });
  await expect(GET(event("?client=workspace&request=" + "x".repeat(2049)))).rejects.toMatchObject({
    status: 400,
  });
  expect(setTransaction).not.toHaveBeenCalled();
});
