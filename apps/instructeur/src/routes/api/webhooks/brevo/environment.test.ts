import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock(import("@pitchou/server/cnpnEmailBrevo.ts"), () => ({
  processDossierCnpnEmailBrevoEvent: vi.fn(),
}));

import { processDossierCnpnEmailBrevoEvent } from "@pitchou/server/cnpnEmailBrevo.ts";
import { POST } from "./+server.ts";

beforeEach(() => {
  vi.stubEnv("BREVO_WEBHOOK_SECRET", "test-secret");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.mocked(processDossierCnpnEmailBrevoEvent).mockReset().mockResolvedValue("processed");
});
afterEach(() => vi.unstubAllEnvs());

function notify(tags: unknown, event = "opened", authorized = true) {
  return POST({
    request: new Request("http://pitchou.test/api/webhooks/brevo", {
      method: "POST",
      headers: authorized ? { Authorization: "Bearer test-secret" } : {},
      body: JSON.stringify({
        event,
        tags,
        email: "recipient@example.com",
        "message-id": "provider-id",
        "X-Mailin-custom": "11111111-1111-4111-8111-111111111111",
        ts_event: 1_789_000_000,
      }),
    }),
  } as never);
}

test.each([
  ["staging", "pitchou-env-production"],
  ["", "pitchou-env-staging"],
  ["staging", "pitchou-env-development"],
  ["", "pitchou-env-development"],
  ["staging", "pitchou-env-other"],
])("%s ignores %s even when the IDs could match a local send", async (env, tag) => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", env);
  for (const event of ["delivered", "opened", "unique_opened"]) {
    expect((await notify(["cnpn-saisine", tag], event)).status).toBe(204);
  }
  expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});

test.each([
  ["staging", "production", "pitchou-env-staging"],
  ["", "production", "pitchou-env-production"],
  ["", "development", "pitchou-env-development"],
])(
  "%s / %s processes %s and retries only locally tagged unmatched saisines",
  async (env, nodeEnv, tag) => {
    vi.stubEnv("PUBLIC_PITCHOU_ENV", env);
    vi.stubEnv("NODE_ENV", nodeEnv);
    expect((await notify(["cnpn-saisine", tag])).status).toBe(204);
    expect(processDossierCnpnEmailBrevoEvent).toHaveBeenCalledOnce();

    vi.mocked(processDossierCnpnEmailBrevoEvent).mockResolvedValueOnce("unmatched");
    await expect(notify(["cnpn-saisine", tag])).rejects.toMatchObject({ status: 429 });
    vi.mocked(processDossierCnpnEmailBrevoEvent).mockResolvedValueOnce("retry");
    await expect(notify(["cnpn-saisine", tag])).rejects.toMatchObject({ status: 429 });
    vi.mocked(processDossierCnpnEmailBrevoEvent).mockRejectedValueOnce(
      new Error("Database unavailable"),
    );
    await expect(notify(["cnpn-saisine", tag])).rejects.toMatchObject({ status: 429 });
  },
);

test.each([undefined, [], ["cnpn-saisine"]])(
  "untagged events with tags %j still process local matches, but unknown sends do not retry",
  async (tags) => {
    expect((await notify(tags)).status).toBe(204);
    expect(processDossierCnpnEmailBrevoEvent).toHaveBeenCalledOnce();
    vi.mocked(processDossierCnpnEmailBrevoEvent).mockResolvedValueOnce("unmatched");
    expect((await notify(tags)).status).toBe(204);
  },
);

test("ignores conflicting environment tags rather than processing in both environments", async () => {
  expect(
    (await notify(["cnpn-saisine", "pitchou-env-staging", "pitchou-env-production"])).status,
  ).toBe(204);
  expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});

test("does not retry unmatched login or receipt notifications from this environment", async () => {
  vi.mocked(processDossierCnpnEmailBrevoEvent).mockResolvedValue("unmatched");
  expect((await notify(["pitchou-env-staging"])).status).toBe(204);
  expect((await notify(["cnpn-read-receipt", "pitchou-env-staging"])).status).toBe(204);
});

test("requires authentication even for another environment", async () => {
  await expect(notify(["pitchou-env-production"], "opened", false)).rejects.toMatchObject({
    status: 401,
  });
  expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});

test.each(["pitchou-env-production", null, [42]])(
  "rejects malformed tags %j rather than treating them as historical events",
  async (tags) => {
    await expect(notify(tags)).rejects.toMatchObject({ status: 400 });
    expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
  },
);
