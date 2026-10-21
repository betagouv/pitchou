import type { RequestEvent } from "@sveltejs/kit";
import { beforeEach, expect, test, vi } from "vitest";
import { deleteSession } from "@pitchou/server/session.ts";
import { buildAuthorizationUrl, buildLogoutUrl } from "#lib/server/proconnect.ts";
import { clearSessionCookie, readSessionToken, setTransaction } from "#lib/server/session.ts";
import { GET as login } from "./proconnect/+server.ts";
import { GET as logout } from "./logout/+server.ts";

vi.mock("@pitchou/server/session.ts", () => ({ deleteSession: vi.fn() }));
vi.mock("#lib/server/proconnect.ts", () => ({
  randomToken: () => "random-token",
  buildAuthorizationUrl: vi.fn(),
  buildLogoutUrl: vi.fn(),
}));
vi.mock("#lib/server/session.ts", () => ({
  clearSessionCookie: vi.fn(),
  readSessionToken: vi.fn(),
  setTransaction: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

function request<Route extends "/auth/proconnect" | "/auth/logout">(path: Route, search = "") {
  return {
    url: new URL(path + search, "https://admin.example.fr"),
    cookies: {},
  } as RequestEvent<Record<string, never>, Route>;
}

test("login redirects to ProConnect using SvelteKit's real redirect helper", async () => {
  const location = "https://proconnect.example.fr/api/v2/authorize?state=random-token";
  vi.mocked(buildAuthorizationUrl).mockResolvedValue(location);
  const event = request("/auth/proconnect", "?redirectTo=/dossiers");

  await expect(login(event)).rejects.toMatchObject({ status: 302, location });
  expect(setTransaction).toHaveBeenCalledWith(event.cookies, {
    state: "random-token",
    nonce: "random-token",
    redirectTo: "/dossiers",
  });
});

test("logout clears the local session and redirects to ProConnect", async () => {
  const location = "https://proconnect.example.fr/api/v2/session/end";
  vi.mocked(readSessionToken).mockReturnValue("session-token");
  vi.mocked(deleteSession).mockResolvedValue("id-token");
  vi.mocked(buildLogoutUrl).mockResolvedValue(location);
  const event = request("/auth/logout");

  await expect(logout(event)).rejects.toMatchObject({ status: 302, location });
  expect(deleteSession).toHaveBeenCalledWith("session-token");
  expect(clearSessionCookie).toHaveBeenCalledWith(event.cookies);
});

test("logout without an identity token keeps the internal login fallback", async () => {
  await expect(logout(request("/auth/logout"))).rejects.toMatchObject({
    status: 302,
    location: "/auth/login",
  });
  expect(buildLogoutUrl).not.toHaveBeenCalled();
});
