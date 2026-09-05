import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock(import("@pitchou/server/cnpnEmailBrevo.ts"), () => ({
  processDossierCnpnEmailBrevoEvent: vi.fn(),
}));

import { processDossierCnpnEmailBrevoEvent } from "@pitchou/server/cnpnEmailBrevo.ts";
import { POST } from "./+server.ts";

beforeEach(() => {
  vi.stubEnv("BREVO_WEBHOOK_SECRET", "webhook-secret");
  vi.mocked(processDossierCnpnEmailBrevoEvent).mockReset().mockResolvedValue("processed");
});

afterEach(() => vi.unstubAllEnvs());

function eventRequest(
  payload: Record<string, unknown> | string,
  authorization: string | null = "Bearer webhook-secret",
  url = "http://pitchou.test/api/webhooks/brevo",
) {
  return POST({
    url: new URL(url),
    request: new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization === null ? {} : { Authorization: authorization }),
      },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  } as never);
}

test("enregistre la première ouverture Brevo", async () => {
  const response = await eventRequest({
    event: "unique_opened",
    email: "CNPN@example.com",
    "message-id": "brevo-message-id",
    ts_event: 1_789_000_000,
  });

  expect(response.status).toBe(204);
  expect(processDossierCnpnEmailBrevoEvent).toHaveBeenCalledWith({
    type: "opened",
    providerMessageId: "brevo-message-id",
    requestId: undefined,
    recipientEmail: "cnpn@example.com",
    occurredAt: new Date(1_789_000_000_000),
  });
});

test("ignore les événements non suivis", async () => {
  const response = await eventRequest({ event: "request" });

  expect(response.status).toBe(204);
  expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});

test("demande à Brevo de rejouer une saisine arrivée avant l'enregistrement du mail", async () => {
  vi.mocked(processDossierCnpnEmailBrevoEvent).mockResolvedValueOnce("unmatched");

  await expect(
    eventRequest({
      event: "delivered",
      email: "cnpn@example.com",
      "message-id": "pending-provider-id",
      ts_event: 1_789_000_000,
      tags: ["cnpn-saisine"],
      "X-Mailin-custom": "11111111-1111-7111-8111-111111111111",
    }),
  ).rejects.toMatchObject({ status: 429 });
  expect(processDossierCnpnEmailBrevoEvent).toHaveBeenCalledWith(
    expect.objectContaining({ requestId: "11111111-1111-7111-8111-111111111111" }),
  );
});

test("ignore un mail non suivi qui ne correspond à aucun envoi CNPN", async () => {
  vi.mocked(processDossierCnpnEmailBrevoEvent).mockResolvedValueOnce("unmatched");

  const response = await eventRequest({
    event: "opened",
    email: "login@example.com",
    "message-id": "login-message-id",
    ts_event: 1_789_000_000,
  });

  expect(response.status).toBe(204);
});

test("demande à Brevo de rejouer pendant l'envoi de l'accusé de lecture", async () => {
  vi.mocked(processDossierCnpnEmailBrevoEvent).mockResolvedValueOnce("retry");

  await expect(
    eventRequest({
      event: "opened",
      email: "cnpn@example.com",
      "message-id": "cnpn-message-id",
      ts_event: 1_789_000_000,
    }),
  ).rejects.toMatchObject({ status: 429 });
});

test.each([
  null,
  "",
  "Bearer",
  "Bearer wrong-secret",
  "Bearer WEBHOOK-SECRET",
  "webhook-secret",
  "Basic webhook-secret",
  "Token webhook-secret",
  "Bearer webhook-secret extra",
  "Bearer webhook-secret, Bearer webhook-secret",
  "Bearer\twebhook-secret",
])("refuse l'authentification %s avant de lire le corps", async (authorization) => {
  await expect(eventRequest("not-json", authorization)).rejects.toMatchObject({
    status: 401,
  });
  expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});

test.each([null, "Bearer wrong-secret"])(
  "un secret dans l'URL ne remplace pas l'authentification %s",
  async (authorization) => {
    await expect(
      eventRequest(
        "not-json",
        authorization,
        "http://pitchou.test/api/webhooks/brevo?secret=webhook-secret",
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
  },
);

test.each(["bearer webhook-secret", "BEARER webhook-secret", "Bearer   webhook-secret"])(
  "accepte le schéma HTTP valide %s",
  async (authorization) => {
    expect((await eventRequest({ event: "request" }, authorization)).status).toBe(204);
  },
);

test.each([undefined, "", "   "])(
  "refuse une configuration absente ou vide : %s",
  async (secret) => {
    vi.stubEnv("BREVO_WEBHOOK_SECRET", secret);
    await expect(eventRequest("not-json")).rejects.toMatchObject({ status: 503 });
    expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
  },
);
