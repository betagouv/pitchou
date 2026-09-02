import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import {
  createDossierCnpnEmailSendAttempt,
  getAuthorizedDossierFiles,
  getDossierCnpnEmailSentEvents,
  getPendingDossierCnpnEmailSendAttempt,
  markDossierCnpnEmailSendAttemptFailed,
  markDossierCnpnEmailSendAttemptSent,
  recordDossierCnpnEmailBrevoEvent,
  restartDossierCnpnEmailFailedAttempt,
} from "@pitchou/server/database/dossier_cnpn_email.ts";
import { getDossierFull } from "@pitchou/server/database/dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";

test("charge seulement les pièces jointes du dossier", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const dossierId = instructeur.dossier.id as DossierId;
  const s3 = await getTestS3();
  const authorized = await createFichierS3(db, s3, { name: "saisine.pdf" });
  const unauthorized = await createFichierS3(db, s3, { name: "autre-dossier.pdf" });
  await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
    dossier: instructeur.dossier.id,
    fichier: authorized.id,
  });

  await expect(getAuthorizedDossierFiles(dossierId, [authorized.id], db)).resolves.toMatchObject([
    { id: authorized.id, name: "saisine.pdf" },
  ]);
  await expect(
    getAuthorizedDossierFiles(dossierId, [authorized.id, unauthorized.id], db),
  ).resolves.toEqual([]);
});

test("persiste l'envoi et le charge dans le dossier complet", async () => {
  const instructeur = await createInstructeurWithDossier(db, { email: "sender@example.com" });
  const dossierId = instructeur.dossier.id as DossierId;
  const requestId = "11111111-1111-4111-8111-111111111111";
  await createDossierCnpnEmailSendAttempt(
    {
      id: requestId,
      dossier: dossierId,
      sentBy: instructeur.id as PersonneId,
      sentByEmail: "sender@example.com",
      recipientEmail: "cnpn@example.com",
      ccEmails: ["follower@example.com"],
      subject: "Saisine du CNPN - Projet test",
      htmlBody: "<p>Bonjour</p>",
      payloadHash: "payload-hash",
      attachmentIds: [],
      attachmentNames: ["saisine.pdf"],
    },
    db,
  );
  const event = await markDossierCnpnEmailSendAttemptSent(requestId, "provider-message-id", db);
  const deliveredAt = new Date("2026-09-02T15:15:00Z");
  const openedAt = new Date("2026-09-02T15:16:00Z");
  await expect(
    recordDossierCnpnEmailBrevoEvent(
      {
        type: "delivered",
        providerMessageId: "provider-message-id",
        recipientEmail: "cnpn@example.com",
        occurredAt: deliveredAt,
      },
      db,
    ),
  ).resolves.toBe(true);
  await expect(
    recordDossierCnpnEmailBrevoEvent(
      {
        type: "opened",
        providerMessageId: "provider-message-id",
        recipientEmail: "follower@example.com",
        occurredAt: openedAt,
      },
      db,
    ),
  ).resolves.toBe(false);
  await recordDossierCnpnEmailBrevoEvent(
    {
      type: "opened",
      providerMessageId: "provider-message-id",
      recipientEmail: "cnpn@example.com",
      occurredAt: openedAt,
    },
    db,
  );

  expect(event).toMatchObject({ sent_by_email: "sender@example.com" });
  await expect(
    db("dossier_cnpn_email_sent_event").where({ id: requestId }).first(),
  ).resolves.toMatchObject({
    status: "sent",
    sent_by_email: "sender@example.com",
    html_body: "<p>Bonjour</p>",
    payload_hash: "payload-hash",
    attachment_ids: [],
  });
  await expect(
    createDossierCnpnEmailSendAttempt(
      {
        id: requestId,
        dossier: dossierId,
        sentBy: instructeur.id as PersonneId,
        sentByEmail: "sender@example.com",
        recipientEmail: "cnpn@example.com",
        ccEmails: [],
        subject: "Nouvelle tentative",
        htmlBody: "<p>Ne doit pas être envoyée</p>",
        payloadHash: "different-payload-hash",
        attachmentIds: [],
        attachmentNames: [],
      },
      db,
    ),
  ).resolves.toBe(false);

  const failedRequestId = "22222222-2222-4222-8222-222222222222";
  await createDossierCnpnEmailSendAttempt(
    {
      id: failedRequestId,
      dossier: dossierId,
      sentBy: instructeur.id as PersonneId,
      sentByEmail: "sender@example.com",
      recipientEmail: "cnpn@example.com",
      ccEmails: [],
      subject: "Nouvelle tentative",
      htmlBody: "<p>Bonjour</p>",
      payloadHash: "retry-payload-hash",
      attachmentIds: [],
      attachmentNames: [],
    },
    db,
  );
  await markDossierCnpnEmailSendAttemptFailed(failedRequestId, db);
  await expect(restartDossierCnpnEmailFailedAttempt(failedRequestId, db)).resolves.toBe(true);
  await expect(restartDossierCnpnEmailFailedAttempt(failedRequestId, db)).resolves.toBe(false);
  await expect(getPendingDossierCnpnEmailSendAttempt(dossierId, db)).resolves.toEqual({
    id: failedRequestId,
  });
  await expect(getDossierCnpnEmailSentEvents(dossierId, db)).resolves.toMatchObject([
    {
      id: event.id,
      subject: "Saisine du CNPN - Projet test",
      delivered_at: deliveredAt,
      opened_at: openedAt,
    },
  ]);
  await expect(
    getDossierFull(dossierId, instructeur.cap as CapDossierCap, db),
  ).resolves.toMatchObject({
    cnpnEmailSentEvents: [{ id: event.id, delivered_at: deliveredAt, opened_at: openedAt }],
  });
});
