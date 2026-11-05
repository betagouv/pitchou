import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Handle } from "@sveltejs/kit/hooks";
import type { RequestEvent } from "@sveltejs/kit";
import { readSession } from "@pitchou/server/session.ts";
import { readSessionToken } from "#lib/server/session.ts";
import { handle } from "./hooks.server.ts";

vi.mock("@sveltejs/kit/hooks", () => ({
  sequence: (_sentry: Handle, authenticate: Handle) => authenticate,
}));
vi.mock("@sentry/sveltekit", () => ({ sentryHandle: vi.fn(), handleErrorWithSentry: vi.fn() }));
vi.mock("@pitchou/server/session.ts", () => ({ readSession: vi.fn() }));
vi.mock("#lib/server/session.ts", () => ({ readSessionToken: vi.fn(), setSessionCookie: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("__PITCHOU_ORIGIN__", "https://admin.example.org");
});
afterEach(() => vi.unstubAllGlobals());

test.each([
  [null, "https://admin.example.org", 401],
  [[], "https://admin.example.org", 403],
  [["admin:access"], "https://admin.example.org", 403],
  [["admin:dossiers:update"], "https://admin.example.org", 403],
  [["admin:access", "admin:dossiers:update"], "https://foreign.example.org", 403],
  [["admin:access", "admin:dossiers:update"], "https://admin.example.org", 200],
])(
  "porteur writes require a session, both permissions and matching origin: %j",
  async (permissions, origin, status) => {
    if (permissions) {
      vi.mocked(readSessionToken).mockReturnValue("token");
      vi.mocked(readSession).mockResolvedValue({ id: 7, permissions } as never);
    }
    const url = new URL("https://admin.example.org/api/dossiers/42/porteur");
    const event = {
      url,
      route: { id: "/api/dossiers/[dossierId]/porteur" },
      cookies: {},
      locals: {},
      request: new Request(url, { method: "PUT", headers: { origin } }),
    } as RequestEvent;
    const resolve = vi.fn().mockResolvedValue(new Response("OK"));
    const response = await handle({ event, resolve });
    expect(response.status).toBe(status);
    if (status === 200) expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
    else expect(resolve).not.toHaveBeenCalled();
  },
);
