import { beforeEach, expect, test, vi } from "vitest";

vi.mock(import("@pitchou/server/database/dossier_cnpn_email.ts"), () => ({
  recordDossierCnpnEmailBrevoEvent: vi.fn(),
}));

import { recordDossierCnpnEmailBrevoEvent } from "@pitchou/server/database/dossier_cnpn_email.ts";
import { POST } from "./+server.ts";

beforeEach(() => {
  process.env.BREVO_WEBHOOK_SECRET = "webhook-secret";
  vi.mocked(recordDossierCnpnEmailBrevoEvent).mockReset().mockResolvedValue(true);
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
  expect(recordDossierCnpnEmailBrevoEvent).toHaveBeenCalledWith({
    type: "opened",
    providerMessageId: "brevo-message-id",
    recipientEmail: "cnpn@example.com",
    occurredAt: new Date(1_789_000_000_000),
  });
});

test("ignore les événements non suivis", async () => {
  const response = await eventRequest({ event: "request" });

  expect(response.status).toBe(204);
  expect(recordDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});

test("refuse un secret incorrect", async () => {
  await expect(eventRequest({ event: "delivered" }, "wrong-secret")).rejects.toMatchObject({
    status: 401,
  });
  expect(recordDossierCnpnEmailBrevoEvent).not.toHaveBeenCalled();
});
