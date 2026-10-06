import type { Handle, RequestEvent } from "@sveltejs/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserId } from "@pitchou/types/permissions.ts";
import { readSession } from "@pitchou/server/session.ts";
import { readSessionToken, setSessionCookie } from "$lib/server/session.ts";
import { handle } from "./hooks.server.ts";

// Isolate authentication from Sentry and SvelteKit's request-context setup.
vi.mock("@sveltejs/kit/hooks", () => ({
  sequence: (_sentry: Handle, authenticate: Handle) => authenticate,
}));
vi.mock("@sentry/sveltekit", () => ({
  sentryHandle: vi.fn(),
  handleErrorWithSentry: vi.fn(),
}));
vi.mock("@pitchou/server/session.ts", () => ({ readSession: vi.fn() }));
vi.mock("$lib/server/session.ts", () => ({
  readSessionToken: vi.fn(),
  setSessionCookie: vi.fn(),
}));

function request(
  path: string,
  routeId: string | null = new URL(path, "http://localhost").pathname,
) {
  const event = {
    url: new URL(path, "http://localhost"),
    route: { id: routeId },
    cookies: {},
    request: new Request(new URL(path, "http://localhost")),
    locals: {},
  } as RequestEvent;
  const resolve = vi.fn().mockResolvedValue(new Response("OK"));
  return { event, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("authentication responses", () => {
  it.each([
    "/docs/style/dsfr/dsfr.css",
    "/docs/style/dsfr/utility/utility.css",
    "/docs/style/dsfr/dsfr.module.js",
  ])("serves %s without a session through the resolved docs route", async (path) => {
    const input = request(path, "/docs/[...path]");
    const response = await handle(input);

    expect(response.status).toBe(200);
    expect(response.headers.has("location")).toBe(false);
    expect(input.resolve).toHaveBeenCalledWith(input.event);
    expect(readSessionToken).not.toHaveBeenCalled();
    expect(readSession).not.toHaveBeenCalled();
  });

  it("does not exempt other resolved routes because of an asset-looking pathname", async () => {
    const input = request("/docs/style/dsfr/dsfr.css", "/api/users");
    const response = await handle(input);

    expect(response.status).toBe(401);
    expect(input.resolve).not.toHaveBeenCalled();
  });

  it.each(["/", "/dossiers?search=test", "/%", "/%FF"])(
    "returns a login response without rejecting for %s",
    async (path) => {
      const input = request(path);
      const response = await handle(input);

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        `/auth/login?redirectTo=${encodeURIComponent(path)}`,
      );
      expect(input.resolve).not.toHaveBeenCalled();
      expect(readSession).not.toHaveBeenCalled();
    },
  );

  it.each(["/dossiers", "/%", "/%FF"])(
    "returns an access-denied response without rejecting for %s",
    async (path) => {
      vi.mocked(readSessionToken).mockReturnValue("session-token");
      vi.mocked(readSession).mockResolvedValue({
        email: "user@example.com",
        name: "User",
        idToken: null,
        id: 1 as UserId,
        active: true,
        first_names: "",
        last_name: "",
        first_login_at: null,
        last_login_at: null,
        groupes: [],
        permissions: [],
      });
      const input = request(path);
      const response = await handle(input);

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/auth/acces-refuse");
      expect(input.resolve).not.toHaveBeenCalled();
      expect(setSessionCookie).toHaveBeenCalledWith(input.event.cookies, "session-token");
    },
  );

  it.each([false, true])("does not redirect API requests, signed in: %s", async (signedIn) => {
    if (signedIn) {
      vi.mocked(readSessionToken).mockReturnValue("session-token");
      vi.mocked(readSession).mockResolvedValue({
        email: "user@example.com",
        name: "User",
        idToken: null,
        id: 1 as UserId,
        active: true,
        first_names: "",
        last_name: "",
        first_login_at: null,
        last_login_at: null,
        groupes: [],
        permissions: [],
      });
    }
    const input = request("/api/%");
    const response = await handle(input);

    expect(response.status).toBe(signedIn ? 403 : 401);
    expect(response.headers.has("location")).toBe(false);
    expect(input.resolve).not.toHaveBeenCalled();
  });

  it.each([
    ["/dossiers", "/dossiers", 200],
    ["/api/%75sers", "/api/users", 403],
    ["/%61pi/users", "/api/users", 403],
    ["/%75tilisateurs", "/utilisateurs", 403],
    ["/%67roupes-instructeurs", "/groupes-instructeurs", 403],
    ["/utilisateurs/__data.json", "/utilisateurs", 403],
    ["/missing", null, 200],
  ])("authorizes %s using its resolved route", async (path, routeId, status) => {
    vi.mocked(readSessionToken).mockReturnValue("session-token");
    vi.mocked(readSession).mockResolvedValue({
      email: "admin@example.com",
      name: "Admin",
      idToken: null,
      id: 1 as UserId,
      active: true,
      first_names: "",
      last_name: "",
      first_login_at: null,
      last_login_at: null,
      groupes: [],
      permissions: ["admin:access"],
    });
    const input = request(path as string, routeId as string | null);
    const response = await handle(input);

    expect(response.status).toBe(status);
    if (status === 200) expect(input.resolve).toHaveBeenCalledWith(input.event);
    else expect(input.resolve).not.toHaveBeenCalled();
  });
});
