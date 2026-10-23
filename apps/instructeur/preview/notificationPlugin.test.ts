import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import { afterEach, expect, test, vi } from "vitest";
import { fleetNotifications } from "./notificationPlugin.ts";
import { notificationPage, SEND_NOVELTY_PATH } from "./notificationPage.ts";
import { environmentFixture } from "./environmentFixture.ts";

afterEach(() => vi.unstubAllEnvs());

function setup() {
  const { env, root } = environmentFixture();
  Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value));
  const use = vi.fn();
  const deliver = vi.fn().mockResolvedValue({ sent: 2, failed: 0 });
  const load = vi.fn().mockResolvedValue({ deliverPreviewNoveltyEmails: deliver });
  const plugin = fleetNotifications();
  (plugin.configureServer as (server: ViteDevServer) => unknown)({
    config: { root, server: { origin: env.PUBLIC_SITE_URL_PITCHOU, port: 4000 } },
    middlewares: { use },
    ssrLoadModule: load,
  } as unknown as ViteDevServer);
  const middleware = use.mock.calls[0][0];
  const request = (
    path = SEND_NOVELTY_PATH,
    method = "POST",
    origin: string | undefined = env.PUBLIC_SITE_URL_PITCHOU,
  ) =>
    ({
      url: path,
      method,
      headers: { host: new URL(env.PUBLIC_SITE_URL_PITCHOU).host, origin },
    }) as IncomingMessage;
  const response = () => {
    const res = { setHeader: vi.fn(), end: vi.fn(), writeHead: vi.fn() };
    res.writeHead.mockReturnValue(res);
    return res as unknown as ServerResponse;
  };
  return { middleware, request, response, deliver, load };
}

test("is a serve-only plugin", () => {
  expect(fleetNotifications().apply).toBe("serve");
});
test.each(["GET", "PUT", "DELETE"])("rejects %s without loading a sender", async (method) => {
  const { middleware, request, response, load } = setup();
  const res = response();
  await middleware(request(SEND_NOVELTY_PATH, method), res, vi.fn());
  expect(res.writeHead).toHaveBeenCalledWith(405, { Allow: "POST" });
  expect(load).not.toHaveBeenCalled();
});
test.each([undefined, "https://foreign.test", "null"])(
  "rejects foreign or missing origin %s",
  async (origin) => {
    const { middleware, request, response, load } = setup();
    const req = request();
    req.headers.origin = origin;
    const res = response();
    await middleware(req, res, vi.fn());
    expect(res.writeHead).toHaveBeenCalledWith(403);
    expect(load).not.toHaveBeenCalled();
  },
);
test("rejects a foreign host", async () => {
  const { middleware, request, response, load } = setup();
  const req = request();
  req.headers.host = "foreign.test";
  const res = response();
  await middleware(req, res, vi.fn());
  expect(res.writeHead).toHaveBeenCalledWith(403);
  expect(load).not.toHaveBeenCalled();
});
test.each([
  { result: { sent: 2, failed: 0 }, query: "notifications=sent&sent=2" },
  { result: { sent: 0, failed: 0 }, query: "notifications=empty&sent=0" },
  { result: { sent: 1, failed: 1 }, query: "notifications=error&sent=1" },
])("redirects after dispatch with $query", async ({ result, query }) => {
  const { middleware, request, response, deliver } = setup();
  deliver.mockResolvedValue(result);
  const res = response();
  await middleware(request(), res, vi.fn());
  expect(deliver).toHaveBeenCalledOnce();
  expect(res.writeHead).toHaveBeenCalledWith(303, { Location: `/__fleet/accounts?${query}` });
});
test("returns error feedback when dispatch cannot load", async () => {
  const { middleware, request, response, load } = setup();
  load.mockRejectedValue(new Error("unavailable"));
  const res = response();
  await middleware(request(), res, vi.fn());
  expect(res.writeHead).toHaveBeenCalledWith(303, {
    Location: "/__fleet/accounts?notifications=error",
  });
});
test("renders account selection and the test form without loading the sender", async () => {
  const { middleware, request, response, load } = setup();
  const res = response();
  await middleware(request("/__fleet/accounts", "GET"), res, vi.fn());
  expect(res.end).toHaveBeenCalledWith(
    expect.stringContaining('method="post" action="/__fleet/signin/1"'),
  );
  expect(res.end).toHaveBeenCalledWith(
    expect.stringContaining("Envoyer les nouveautés en attente"),
  );
  expect(load).not.toHaveBeenCalled();
});
test.each([
  ["notifications=sent&sent=1", "1 mail de nouveauté envoyé"],
  ["notifications=sent&sent=2", "2 mails de nouveauté envoyés"],
  ["notifications=empty", "Aucun mail de nouveauté à envoyer."],
  ["notifications=error", "L'envoi a échoué."],
])("renders French feedback for %s", (query, expected) => {
  const html = notificationPage(["a<test>@test.fr"], new URLSearchParams(query));
  expect(html).toContain(expected);
  expect(html).toContain('href="/__fleet/mail/"');
  expect(html).toContain("a&lt;test&gt;@test.fr");
});
