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

function request(path: string) {
  const event = {
    url: new URL(path, "http://localhost"),
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

  it("allows administrators through", async () => {
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
    const input = request("/dossiers");
    const response = await handle(input);

    expect(response.status).toBe(200);
    expect(input.resolve).toHaveBeenCalledWith(input.event);
  });
});
