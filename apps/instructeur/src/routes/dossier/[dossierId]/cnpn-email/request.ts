import { error } from "@sveltejs/kit";
import { rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import { sanitizeCnpnEmailHtml } from "@pitchou/server/cnpnEmail.ts";
import type { SendCnpnEmailRequest } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";

const requestProperties = new Set([
  "requestId",
  "recipient",
  "subject",
  "htmlBody",
  "cc",
  "attachmentIds",
]);
const MAX_ATTACHMENTS = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseDossierId(raw: string): DossierId {
  const dossierId = Number(raw);
  if (!Number.isInteger(dossierId) || dossierId <= 0) error(400, "dossierId invalide");
  return dossierId as DossierId;
}

export function parseRequest(value: Record<string, unknown>): SendCnpnEmailRequest {
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
