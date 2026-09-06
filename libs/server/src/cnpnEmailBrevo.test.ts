import { beforeEach, expect, test, vi } from "vitest";

const {
  markDossierCnpnEmailReadReceiptSent,
  recordDossierCnpnEmailBrevoEvent,
  releaseDossierCnpnEmailReadReceipt,
  sendCnpnEmailReadReceipt,
  transaction,
} = vi.hoisted(() => ({
  markDossierCnpnEmailReadReceiptSent: vi.fn(),
  recordDossierCnpnEmailBrevoEvent: vi.fn(),
  releaseDossierCnpnEmailReadReceipt: vi.fn(),
  sendCnpnEmailReadReceipt: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("./database.ts", () => ({ directDatabaseConnection: { transaction } }));
vi.mock("./database/dossier_cnpn_email.ts", () => ({
  markDossierCnpnEmailReadReceiptSent,
  recordDossierCnpnEmailBrevoEvent,
  releaseDossierCnpnEmailReadReceipt,
}));
vi.mock("./emails.ts", () => ({ sendCnpnEmailReadReceipt }));

import { processDossierCnpnEmailBrevoEvent } from "./cnpnEmailBrevo.ts";

const event = {
  type: "opened" as const,
  providerMessageId: "provider-id",
  recipientEmail: "cnpn@example.com",
  occurredAt: new Date("2026-09-04T08:00:00Z"),
};
const claimedAt = new Date("2026-09-04T08:01:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (callback) => callback("transaction"));
  markDossierCnpnEmailReadReceiptSent.mockResolvedValue(undefined);
  releaseDossierCnpnEmailReadReceipt.mockResolvedValue(undefined);
  sendCnpnEmailReadReceipt.mockResolvedValue({ messageId: "receipt-message-id" });
});

test("envoie un accusé au gestionnaire lors de la première ouverture", async () => {
  recordDossierCnpnEmailBrevoEvent.mockResolvedValue({
    matched: true,
    readReceipt: {
      eventId: "email-event-id",
      claimedAt,
      sentByEmail: "instructeur@example.com",
      dossierId: 42,
      subject: "Saisine du CNPN - Projet test",
    },
  });

  await expect(processDossierCnpnEmailBrevoEvent(event)).resolves.toBe("processed");

  expect(recordDossierCnpnEmailBrevoEvent).toHaveBeenCalledWith(event, "transaction");
  expect(sendCnpnEmailReadReceipt).toHaveBeenCalledWith("instructeur@example.com", {
    eventId: "email-event-id",
    dossierId: 42,
    originalSubject: "Saisine du CNPN - Projet test",
  });
  expect(markDossierCnpnEmailReadReceiptSent).toHaveBeenCalledWith("email-event-id", claimedAt);
});

test("n'envoie pas plusieurs accusés pour la même ouverture", async () => {
  recordDossierCnpnEmailBrevoEvent.mockResolvedValue({ matched: true });

  await expect(processDossierCnpnEmailBrevoEvent(event)).resolves.toBe("processed");

  expect(sendCnpnEmailReadReceipt).not.toHaveBeenCalled();
});

test("demande un nouvel essai pendant l'envoi d'un accusé", async () => {
  recordDossierCnpnEmailBrevoEvent.mockResolvedValue({
    matched: true,
    retryReadReceipt: true,
  });

  await expect(processDossierCnpnEmailBrevoEvent(event)).resolves.toBe("retry");

  expect(sendCnpnEmailReadReceipt).not.toHaveBeenCalled();
});

test("libère l'accusé pour un nouvel essai si Brevo refuse l'envoi", async () => {
  recordDossierCnpnEmailBrevoEvent.mockResolvedValue({
    matched: true,
    readReceipt: {
      eventId: "email-event-id",
      claimedAt,
      sentByEmail: "instructeur@example.com",
      dossierId: 42,
      subject: "Saisine du CNPN - Projet test",
    },
  });
  sendCnpnEmailReadReceipt.mockRejectedValueOnce(new Error("Brevo unavailable"));

  await expect(processDossierCnpnEmailBrevoEvent(event)).rejects.toThrow("Brevo unavailable");

  expect(releaseDossierCnpnEmailReadReceipt).toHaveBeenCalledWith("email-event-id", claimedAt);
  expect(markDossierCnpnEmailReadReceiptSent).not.toHaveBeenCalled();
});
