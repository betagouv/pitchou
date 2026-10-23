import { error } from "@sveltejs/kit";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireDossierWriteAccess } from "#lib/server/auth.ts";
import {
  createDossierCnpnEmailSendAttempt,
  getAuthorizedDossierFiles,
  getDossierCnpnEmailSendAttempt,
  getDossierCnpnEmailSentEventById,
  restartDossierCnpnEmailFailedAttempt,
} from "@pitchou/server/database/dossier_cnpn_email.ts";

export async function authorizeSendAttempt(
  input: Parameters<typeof createDossierCnpnEmailSendAttempt>[0],
) {
  // Commit authorization and the send intent together. Delivery then completes
  // this accepted operation, even if access changes while Brevo responds.
  return directDatabaseConnection.transaction(async (transaction) => {
    await requireDossierWriteAccess(input.dossier, input.sentBy, transaction);
    const files = await getAuthorizedDossierFiles(input.dossier, input.attachmentIds, transaction);
    if (files.length !== input.attachmentIds.length) {
      error(403, "Une pièce jointe n'appartient pas à ce dossier.");
    }
    if (await createDossierCnpnEmailSendAttempt(input, transaction)) return;
    const existing = await getDossierCnpnEmailSentEventById(input.id, input.dossier, transaction);
    if (existing) return existing;
    const attempt = await getDossierCnpnEmailSendAttempt(input.id, input.dossier, transaction);
    if (
      attempt?.status === "failed" &&
      attempt.payload_hash === input.payloadHash &&
      (await restartDossierCnpnEmailFailedAttempt(input.id, transaction))
    )
      return;
    error(425, "Cet envoi a déjà été lancé. Vérifiez Brevo avant de recommencer.");
  });
}
