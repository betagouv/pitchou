import "./setup.ts";
import { expect, test } from "vitest";
import { db } from "../../setup/db.ts";
import { createInstructeurWithDossier } from "../../factories/index.ts";
import {
  createDossierCnpnEmailSendAttempt,
  markDossierCnpnEmailSendAttemptSent,
  recordDossierCnpnEmailBrevoEvent,
} from "@pitchou/server/database/dossier_cnpn_email.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

test("réconcilie un webhook reçu avant la fin de l'envoi et ignore les copies", async () => {
  const instructeur = await createInstructeurWithDossier(db, { email: "sender@example.com" });
  const dossierId = instructeur.dossier.id as DossierId;
  const requestId = "33333333-3333-4333-8333-333333333333";
  await createDossierCnpnEmailSendAttempt(
    {
      id: requestId,
      dossier: dossierId,
      sentBy: instructeur.id as PersonneId,
      sentByEmail: "sender@example.com",
      recipientEmail: "cnpn@example.com",
      ccEmails: ["follower@example.com"],
      subject: "Saisine précoce",
      htmlBody: "<p>Bonjour</p>",
      payloadHash: "early-payload-hash",
      attachmentIds: [],
      attachmentNames: [],
    },
    db,
  );
  const createdAt = await db("dossier_cnpn_email_sent_event")
    .where({ id: requestId })
    .first("created_at");

  await expect(
    recordDossierCnpnEmailBrevoEvent(
      {
        type: "delivered",
        providerMessageId: "early-provider-id",
        requestId,
        recipientEmail: "follower@example.com",
        occurredAt: new Date("2026-09-04T08:00:00Z"),
      },
      db,
    ),
  ).resolves.toEqual({ matched: true });
  await expect(
    markDossierCnpnEmailSendAttemptSent(requestId, "early-provider-id", db),
  ).resolves.toMatchObject({ id: requestId });
  await expect(
    db("dossier_cnpn_email_sent_event").where({ id: requestId }).first(),
  ).resolves.toMatchObject({ status: "sent", sent_at: createdAt.created_at, delivered_at: null });

  const openedAt = new Date("2026-09-04T08:01:00Z");
  await expect(
    recordDossierCnpnEmailBrevoEvent(
      {
        type: "opened",
        providerMessageId: "recipient-provider-id",
        requestId,
        recipientEmail: "cnpn@example.com",
        occurredAt: openedAt,
      },
      db,
    ),
  ).resolves.toMatchObject({ matched: true, readReceipt: { eventId: requestId } });
  await expect(
    db("dossier_cnpn_email_sent_event").where({ id: requestId }).first(),
  ).resolves.toMatchObject({ provider_message_id: "early-provider-id", opened_at: openedAt });
});
