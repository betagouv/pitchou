import { beforeEach, expect, test, vi } from "vitest";

vi.mock(import("@pitchou/server/cnpnEmailBrevo.ts"), () => ({
  processDossierCnpnEmailBrevoEvent: vi.fn(),
}));

import { processDossierCnpnEmailBrevoEvent } from "@pitchou/server/cnpnEmailBrevo.ts";
import { POST } from "./+server.ts";

beforeEach(() => {
  process.env.BREVO_WEBHOOK_SECRET = "webhook-secret";
  vi.mocked(processDossierCnpnEmailBrevoEvent).mockReset().mockResolvedValue("processed");
});

function eventRequest(payload: Record<string, unknown>, secret = "webhook-secret") {
  return POST({
    url: new URL(`http://pitchou.test/api/webhooks/brevo?secret=${secret}`),
    request: new Request("http://pitchou.test/api/webhooks/brevo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

test("refuse un secret incorrect", async () => {
  await expect(eventRequest({ event: "delivered" }, "wrong-secret")).rejects.toMatchObject({
    status: 401,
  });
  expect(processDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});
