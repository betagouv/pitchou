import type { RequestEvent } from "@sveltejs/kit";
import { beforeEach, expect, test, vi } from "vitest";
import { connectUser, getSessionUser } from "@pitchou/server/users.ts";
import { createSession } from "@pitchou/server/session.ts";
import { exchangeCodeAndFetchUser } from "#lib/server/proconnect.ts";
import { finishBridgeLogin } from "#lib/server/loginBridge.ts";
import { readTransaction, setSessionCookie } from "#lib/server/session.ts";
import { GET } from "./+server.ts";

vi.mock("@pitchou/server/users.ts", () => ({ connectUser: vi.fn(), getSessionUser: vi.fn() }));
vi.mock("@pitchou/server/session.ts", () => ({ createSession: vi.fn() }));
vi.mock("#lib/server/proconnect.ts", () => ({ exchangeCodeAndFetchUser: vi.fn() }));
vi.mock("#lib/server/loginBridge.ts", () => ({ finishBridgeLogin: vi.fn() }));
vi.mock("#lib/server/session.ts", () => ({
  readTransaction: vi.fn(),
  clearTransaction: vi.fn(),
  setSessionCookie: vi.fn(),
}));
const identity = {
  issuer: "https://provider.example.fr",
  subject: "user1",
  email: "team@example.fr",
  firstNames: "Test",
  lastName: "User",
  name: "Test User",
  idToken: "private",
};
const event = () =>
  ({
    url: new URL("https://admin.example.fr/auth/callback?code=provider-code&state=expected"),
    cookies: {},
    setHeaders: vi.fn(),
  }) as unknown as RequestEvent<Record<string, never>, "/auth/callback">;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readTransaction).mockResolvedValue({
    state: "expected",
    nonce: "nonce",
    redirectTo: "/dossiers",
  });
  vi.mocked(exchangeCodeAndFetchUser).mockResolvedValue(identity);
});

test("normal staging login still creates its own session and keeps its destination", async () => {
  vi.mocked(connectUser).mockResolvedValue({ id: 1, active: true } as never);
  vi.mocked(getSessionUser).mockResolvedValue({ permissions: ["admin:access"] } as never);
  vi.mocked(createSession).mockResolvedValue("staging-session");
  const req = event();
  await expect(GET(req)).rejects.toMatchObject({ status: 303, location: "/dossiers" });
  expect(setSessionCookie).toHaveBeenCalledWith(req.cookies, "staging-session");
  expect(finishBridgeLogin).not.toHaveBeenCalled();
});

test("bridge login verifies ProConnect before handing off and never creates a staging session", async () => {
  const bridge = { client: "workspace", state: "target-state", challenge: "challenge" };
  vi.mocked(readTransaction).mockResolvedValue({
    state: "expected",
    nonce: "nonce",
    redirectTo: "/",
    bridge,
  });
  vi.mocked(finishBridgeLogin).mockResolvedValue(
    "https://onagre.example.fr/auth/bridge/callback?ticket=encrypted",
  );
  await expect(GET(event())).rejects.toMatchObject({
    status: 303,
    location: "https://onagre.example.fr/auth/bridge/callback?ticket=encrypted",
  });
  expect(exchangeCodeAndFetchUser).toHaveBeenCalledWith("provider-code", "nonce");
  expect(finishBridgeLogin).toHaveBeenCalledWith(bridge, identity);
  expect(connectUser).not.toHaveBeenCalled();
  expect(createSession).not.toHaveBeenCalled();
  expect(setSessionCookie).not.toHaveBeenCalled();
});

test("wrong OAuth state prevents both identity exchange and handoff", async () => {
  const req = event();
  req.url.searchParams.set("state", "wrong");
  await expect(GET(req)).rejects.toMatchObject({ status: 400 });
  expect(exchangeCodeAndFetchUser).not.toHaveBeenCalled();
  expect(finishBridgeLogin).not.toHaveBeenCalled();
});

test("provider verification failure cannot issue a handoff", async () => {
  vi.mocked(readTransaction).mockResolvedValue({
    state: "expected",
    nonce: "nonce",
    redirectTo: "/",
    bridge: { client: "workspace", state: "target-state", challenge: "challenge" },
  });
  vi.mocked(exchangeCodeAndFetchUser).mockRejectedValue(
    new Error("Deliberate verification failure"),
  );
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await expect(GET(event())).rejects.toMatchObject({ status: 502 });
  } finally {
    log.mockRestore();
  }
  expect(finishBridgeLogin).not.toHaveBeenCalled();
});
