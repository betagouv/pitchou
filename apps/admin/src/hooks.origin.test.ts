import type { Handle } from "@sveltejs/kit/hooks";
import type { RequestEvent } from "@sveltejs/kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserId } from "@pitchou/types/permissions.ts";
import { readSession } from "@pitchou/server/session.ts";
import { readSessionToken } from "#lib/server/session.ts";
import { handle } from "./hooks.server.ts";

vi.mock("@sveltejs/kit/hooks", () => ({
  sequence: (_sentry: Handle, authenticate: Handle) => authenticate,
}));
vi.mock("@sentry/sveltekit", () => ({
  sentryHandle: vi.fn(),
  handleErrorWithSentry: vi.fn(),
}));
vi.mock("@pitchou/server/session.ts", () => ({ readSession: vi.fn() }));
vi.mock("#lib/server/session.ts", () => ({
  readSessionToken: vi.fn(),
  setSessionCookie: vi.fn(),
}));

const publicOrigin = "https://staging.admin.pitchou.incubateur.net";
const siblingOrigin = "https://staging.pitchou.incubateur.net";
const internalOrigin = "http://admin:3000";

function request(origin?: string, method = "POST", requestOrigin = internalOrigin) {
  const path = method === "PUT" || method === "DELETE" ? "/api/dossiers/1" : "/api/dossiers";
  const url = new URL(path, requestOrigin);
  const event = {
    url,
    route: { id: path === "/api/dossiers" ? path : "/api/dossiers/[dossierId]" },
    cookies: {},
    request: new Request(url, { method, headers: origin === undefined ? {} : { origin } }),
    locals: {},
  } as RequestEvent;
  const resolve = vi.fn().mockResolvedValue(new Response("OK"));
  return { event, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("__PITCHOU_ORIGIN__", publicOrigin);
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
    permissions: [
      "admin:access",
      "admin:dossiers:create",
      "admin:dossiers:update",
      "admin:dossiers:delete",
    ],
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("mutation origin", () => {
  it.each(["POST", "PUT", "DELETE"])(
    "accepts the configured HTTPS origin behind an internal HTTP URL for %s",
    async (method) => {
      const input = request(publicOrigin, method);

      const response = await handle(input);

      expect(response.status).toBe(200);
      expect(input.resolve).toHaveBeenCalledWith(input.event);
    },
  );

  it.each([
    undefined,
    "null",
    "https://foreign.example",
    siblingOrigin,
    internalOrigin,
    "http://staging.admin.pitchou.incubateur.net",
    `${publicOrigin}:444`,
    `${publicOrigin}/`,
    `${publicOrigin}.foreign.example`,
  ])("rejects a nonmatching Origin header %s", async (origin) => {
    const input = request(origin);

    const response = await handle(input);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Origine de la requête refusée");
    expect(input.resolve).not.toHaveBeenCalled();
  });

  it("uses the request URL origin when no public origin is configured", async () => {
    vi.stubGlobal("__PITCHOU_ORIGIN__", null);
    const input = request(internalOrigin);

    const response = await handle(input);

    expect(response.status).toBe(200);
    expect(input.resolve).toHaveBeenCalledWith(input.event);
  });

  it.each([undefined, "null", publicOrigin, siblingOrigin, `${internalOrigin}/`])(
    "requires an exact request URL origin without configuration, received %s",
    async (origin) => {
      vi.stubGlobal("__PITCHOU_ORIGIN__", null);
      const input = request(origin);

      const response = await handle(input);

      expect(response.status).toBe(403);
      expect(await response.text()).toBe("Origine de la requête refusée");
      expect(input.resolve).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "null", "https://foreign.example", siblingOrigin])(
    "does not apply the mutation origin guard to GET with Origin %s",
    async (origin) => {
      const input = request(origin, "GET");

      const response = await handle(input);

      expect(response.status).toBe(200);
      expect(input.resolve).toHaveBeenCalledWith(input.event);
    },
  );
});
