import type { RequestEvent } from "@sveltejs/kit";
import { beforeEach, expect, test, vi } from "vitest";
import { receiveBridgeLogin } from "#lib/server/loginBridge.ts";
import { acceptHandoff } from "#lib/server/loginBridge/accept.ts";
import { setSessionCookie } from "#lib/server/session.ts";
import { GET } from "./+server.ts";
vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: {} }));
vi.mock("#lib/server/loginBridge.ts", () => ({ receiveBridgeLogin: vi.fn() }));
vi.mock("#lib/server/loginBridge/accept.ts", () => ({ acceptHandoff: vi.fn() }));
vi.mock("#lib/server/session.ts", () => ({ setSessionCookie: vi.fn() }));
const event = () =>
  ({
    url: new URL("https://onagre.example.fr/auth/bridge/callback"),
    cookies: {},
    setHeaders: vi.fn(),
  }) as unknown as RequestEvent<Record<string, never>, "/auth/bridge/callback">;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(receiveBridgeLogin).mockResolvedValue({ redirectTo: "/onagre?tab=dump" } as never);
});
test("valid handoff creates only the target session and redirects off the ticket URL", async () => {
  vi.mocked(acceptHandoff).mockResolvedValue("target-session");
  const req = event();
  await expect(GET(req)).rejects.toMatchObject({ status: 303, location: "/onagre?tab=dump" });
  expect(setSessionCookie).toHaveBeenCalledWith(req.cookies, "target-session");
  expect(req.setHeaders).toHaveBeenCalledWith({
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  });
});
test("missing permission denies access without setting a session", async () => {
  vi.mocked(acceptHandoff).mockResolvedValue(null);
  await expect(GET(event())).rejects.toMatchObject({ status: 303, location: "/auth/acces-refuse" });
  expect(setSessionCookie).not.toHaveBeenCalled();
});
test("browser binding failure never accesses the database", async () => {
  vi.mocked(receiveBridgeLogin).mockRejectedValue(new Error("Wrong browser"));
  await expect(GET(event())).rejects.toMatchObject({ status: 400 });
  expect(acceptHandoff).not.toHaveBeenCalled();
});
test("replay rejection never sets a session", async () => {
  vi.mocked(acceptHandoff).mockRejectedValue(new Error("Already used"));
  await expect(GET(event())).rejects.toMatchObject({ status: 400 });
  expect(setSessionCookie).not.toHaveBeenCalled();
});
