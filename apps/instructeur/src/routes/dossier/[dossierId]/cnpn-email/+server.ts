import { error, json } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { createHash } from "node:crypto";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth.ts";
import { readJsonObject } from "$lib/server/requestValidation.ts";
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
import {
  base64MimeBytes,
  estimateEmailBytes,
  isDefinitiveEmailSendFailure,
  MAX_EMAIL_BYTES,
  sendEmail,
  type EmailMessage,
} from "@pitchou/server/emails.ts";
import { parseDossierId, parseRequest } from "./request.ts";

const CNPN_EMAIL = "derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr";
const EMAIL_SIZE_ERROR =
  "Le mail dépasse la limite de 20 Mo après encodage. Réduisez les pièces jointes ou le corps du mail.";
const IS_TEST_ENVIRONMENT = dev || process.env.PUBLIC_PITCHOU_ENV === "staging";

async function readableToBuffer(body: NodeJS.ReadableStream, budget: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of body) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (base64MimeBytes(bytes) >= budget) error(413, EMAIL_SIZE_ERROR);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(parseDossierId(params.dossierId!), cap);
  const sender = await getPersonneByDossierCap(cap);
  if (!sender?.email) error(403, "Aucune adresse email n'est associée à cette capability.");
  // Resolve the cap owner, not a recipient or a dossier follower: /dev-login
  // publicly exposes this account's access code on staging.
  if (
    process.env.PUBLIC_PITCHOU_ENV === "staging" &&
    sender.email.trim().toLowerCase() ===
      (process.env.SEED_EMAIL || "dev@localhost.local").trim().toLowerCase()
  ) {
    error(403, "L'envoi de mails CNPN est désactivé pour le compte de démonstration.");
  }
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
  const cc = [...new Set(draft.cc)].filter((email) => email !== recipient && email !== CNPN_EMAIL);
  if (cc.length > 98) error(400, "Le mail ne peut pas contenir plus de 98 destinataires en copie.");
  const email: EmailMessage = {
    to: [recipient],
    cc,
    replyTo: sender.email,
    subject: draft.subject,
    htmlContent: draft.htmlBody,
    tags: ["cnpn-saisine"],
    headers: { idempotencyKey: draft.requestId, "X-Mailin-custom": draft.requestId },
  };
  let attachmentBudget =
    MAX_EMAIL_BYTES -
    estimateEmailBytes({
      ...email,
      attachments: files.map(({ name }) => ({ name, size: 0 })),
    });
  if (attachmentBudget <= 0) error(413, EMAIL_SIZE_ERROR);
  const fileById = new Map(files.map((file) => [file.id, file]));
  const attachments = [];
  for (const fileId of draft.attachmentIds) {
    const metadata = fileById.get(fileId)!;
    const content = await loadFichierContent(fileId);
    if (!content) error(409, `La pièce jointe '${metadata.name}' n'est plus disponible.`);
    // DB sizes can be stale. Enforce the budget on actual bytes, before any attempt is stored.
    const buffer = await readableToBuffer(content.body, attachmentBudget);
    attachmentBudget -= base64MimeBytes(buffer.length);
    attachments.push({ name: metadata.name, content: buffer });
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
    ({ messageId } = await sendEmail({ ...email, attachments }));
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
