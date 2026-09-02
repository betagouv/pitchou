import { error, json } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { createHash } from "node:crypto";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import {
  createDossierCnpnEmailSendAttempt,
  getAuthorizedDossierFiles,
  getDossierCnpnEmailSendAttempt,
  getDossierCnpnEmailSentEventById,
  getPendingDossierCnpnEmailSendAttempt,
  markDossierCnpnEmailSendAttemptFailed,
  markDossierCnpnEmailSendAttemptSent,
  restartDossierCnpnEmailFailedAttempt,
} from "@pitchou/server/database/dossier_cnpn_email.ts";
import { loadFichierContent } from "@pitchou/server/database/fichier.ts";
import { sanitizeCnpnEmailHtml } from "@pitchou/server/cnpnEmail.ts";
import { isDefinitiveEmailSendFailure, sendEmail } from "@pitchou/server/emails.ts";
import type { SendCnpnEmailRequest } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";

const CNPN_EMAIL = "derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr";
const requestProperties = new Set([
  "requestId",
  "recipient",
  "subject",
  "htmlBody",
  "cc",
  "attachmentIds",
]);
const MAX_ATTACHMENTS = 20;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IS_TEST_ENVIRONMENT = dev || process.env.PUBLIC_PITCHOU_ENV === "staging";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDossierId(raw: string): DossierId {
  const dossierId = Number(raw);
  if (!Number.isInteger(dossierId) || dossierId <= 0) error(400, "dossierId invalide");
  return dossierId as DossierId;
}

function parseRequest(value: Record<string, unknown>): SendCnpnEmailRequest {
  rejectUnknownProperties(value, requestProperties);
  if (typeof value.requestId !== "string" || !UUID_PATTERN.test(value.requestId)) {
    error(400, "L'identifiant de la demande est invalide.");
  }
  if (
    value.recipient !== undefined &&
    (typeof value.recipient !== "string" || !EMAIL_PATTERN.test(value.recipient.trim()))
  ) {
    error(400, "L'adresse du destinataire de test n'est pas valide.");
  }
  if (typeof value.subject !== "string" || !value.subject.trim() || value.subject.length > 255) {
    error(400, "L'objet doit contenir entre 1 et 255 caractères.");
  }
  if (typeof value.htmlBody !== "string" || value.htmlBody.length > 200_000) {
    error(400, "Le corps HTML est invalide ou trop volumineux.");
  }
  if (
    !Array.isArray(value.cc) ||
    value.cc.some((email) => typeof email !== "string" || !EMAIL_PATTERN.test(email.trim()))
  ) {
    error(400, "Une adresse en copie n'est pas valide.");
  }
  if (
    !Array.isArray(value.attachmentIds) ||
    value.attachmentIds.length > MAX_ATTACHMENTS ||
    value.attachmentIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id)) ||
    new Set(value.attachmentIds).size !== value.attachmentIds.length
  ) {
    error(400, `Les pièces jointes doivent être uniques et limitées à ${MAX_ATTACHMENTS}.`);
  }
  const htmlBody = sanitizeCnpnEmailHtml(value.htmlBody);
  if (!htmlBody.replace(/<[^>]+>/g, "").trim()) error(400, "Le corps du mail est vide.");
  return {
    requestId: value.requestId,
    recipient:
      typeof value.recipient === "string" ? value.recipient.trim().toLowerCase() : undefined,
    subject: value.subject.trim(),
    htmlBody,
    cc: value.cc.map((email) => email.trim().toLowerCase()),
    attachmentIds: value.attachmentIds as File["id"][],
  };
}

async function readableToBuffer(body: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(parseDossierId(params.dossierId!), cap);
  const sender = await getPersonneByDossierCap(cap);
  if (!sender?.email) error(403, "Aucune adresse email n'est associée à cette capability.");
  const draft = parseRequest(await readJsonObject(request));
  const recipient = IS_TEST_ENVIRONMENT ? (draft.recipient ?? sender.email) : CNPN_EMAIL;
  const previousEvent = await getDossierCnpnEmailSentEventById(draft.requestId, dossierId);
  if (previousEvent) return json(previousEvent);
  const pendingAttempt = await getPendingDossierCnpnEmailSendAttempt(dossierId);
  if (pendingAttempt) {
    error(425, "Un envoi est déjà en cours ou doit être vérifié dans Brevo.");
  }

  const files = await getAuthorizedDossierFiles(dossierId, draft.attachmentIds);
  if (files.length !== draft.attachmentIds.length) {
    error(403, "Une pièce jointe n'appartient pas à ce dossier.");
  }
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size), 0);
  if (totalBytes > MAX_ATTACHMENT_BYTES) {
    error(413, "Les pièces jointes dépassent la limite de 15 Mo.");
  }

  const cc = [...new Set(draft.cc)].filter((email) => email !== recipient && email !== CNPN_EMAIL);
  if (cc.length > 98) error(400, "Le mail ne peut pas contenir plus de 98 destinataires en copie.");
  const fileById = new Map(files.map((file) => [file.id, file]));
  const attachments = [];
  for (const fileId of draft.attachmentIds) {
    const metadata = fileById.get(fileId)!;
    const content = await loadFichierContent(fileId);
    if (!content) error(409, `La pièce jointe '${metadata.name}' n'est plus disponible.`);
    attachments.push({ name: metadata.name, content: await readableToBuffer(content.body) });
  }
  const payloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        recipient,
        cc,
        replyTo: sender.email,
        subject: draft.subject,
        htmlBody: draft.htmlBody,
        attachmentIds: draft.attachmentIds,
        attachmentNames: attachments.map(({ name }) => name),
      }),
    )
    .digest("hex");

  const created = await createDossierCnpnEmailSendAttempt({
    id: draft.requestId,
    dossier: dossierId,
    sentBy: sender.id,
    sentByEmail: sender.email,
    recipientEmail: recipient,
    ccEmails: cc,
    subject: draft.subject,
    htmlBody: draft.htmlBody,
    payloadHash,
    attachmentIds: draft.attachmentIds,
    attachmentNames: attachments.map(({ name }) => name),
  });
  if (!created) {
    const existing = await getDossierCnpnEmailSentEventById(draft.requestId, dossierId);
    if (existing) return json(existing);
    const attempt = await getDossierCnpnEmailSendAttempt(draft.requestId, dossierId);
    if (
      attempt?.status === "failed" &&
      attempt.payload_hash === payloadHash &&
      (await restartDossierCnpnEmailFailedAttempt(draft.requestId))
    ) {
      // Brevo rejected the previous request before accepting it. Retry the frozen payload.
    } else {
      error(425, "Cet envoi a déjà été lancé. Vérifiez Brevo avant de recommencer.");
    }
  }

  let messageId: string;
  try {
    ({ messageId } = await sendEmail({
      to: [recipient],
      cc,
      replyTo: sender.email,
      subject: draft.subject,
      htmlContent: draft.htmlBody,
      attachments,
    }));
  } catch (sendError) {
    if (isDefinitiveEmailSendFailure(sendError)) {
      await markDossierCnpnEmailSendAttemptFailed(draft.requestId).catch(() => undefined);
      error(502, "Brevo a refusé l'envoi. Vous pouvez réessayer sans modifier le mail.");
    }
    error(
      504,
      "Le résultat de l'envoi est incertain. Ne renvoyez pas le mail avant d'avoir vérifié Brevo.",
    );
  }
  const event = await markDossierCnpnEmailSendAttemptSent(draft.requestId, messageId);
  return json(event, { status: 201 });
};
