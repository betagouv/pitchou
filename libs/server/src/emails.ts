import { createHash } from "node:crypto";
import ky from "ky";

// keep in sync with https://app.brevo.com/templates/listing
const LOGIN_EMAIL_TEMPLATE_ID = 1;

const BREVO_EMAIL_SEND_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const PITCHOU_SENDER = { name: "Pitchou", email: "contact@pitchou.beta.gouv.fr" };

export type BrevoSendResponse = { messageId: string };

function sendBrevoEmail(payload: Record<string, unknown>): Promise<BrevoSendResponse> {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    throw new Error("Missing BREVO_API_KEY environment variable");
  }
  return ky
    .post(BREVO_EMAIL_SEND_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      json: payload,
    })
    .json<BrevoSendResponse>();
}

export function isDefinitiveEmailSendFailure(value: unknown): boolean {
  if (value instanceof Error && value.message === "Missing BREVO_API_KEY environment variable") {
    return true;
  }
  if (!value || typeof value !== "object" || !("response" in value)) return false;
  const response = value.response;
  if (!response || typeof response !== "object" || !("status" in response)) return false;
  const status = response.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 408;
}

export async function sendLoginEmail(email: string, loginLink: string): Promise<any> {
  return sendBrevoEmail({
    templateId: LOGIN_EMAIL_TEMPLATE_ID,
    to: [{ email }],
    params: {
      lien_connexion: loginLink,
    },
  });
}

export function sendEmail({
  to,
  cc = [],
  replyTo,
  subject,
  htmlContent,
  attachments = [],
  tags = [],
  headers = {},
}: {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  htmlContent: string;
  attachments?: { name: string; content: Buffer }[];
  tags?: string[];
  headers?: Record<string, string>;
}): Promise<BrevoSendResponse> {
  return sendBrevoEmail({
    sender: PITCHOU_SENDER,
    to: to.map((email) => ({ email })),
    ...(cc.length > 0 ? { cc: cc.map((email) => ({ email })) } : {}),
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    subject,
    htmlContent,
    ...(tags.length > 0 ? { tags } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(attachments.length > 0
      ? {
          attachment: attachments.map(({ name, content }) => ({
            name,
            content: content.toString("base64"),
          })),
        }
      : {}),
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const CNPN_READ_RECEIPT_NAMESPACE = Buffer.from("2f621668c6f64aef92e71d5df4894d1d", "hex");

function cnpnReadReceiptIdempotencyKey(eventId: string): string {
  const bytes = createHash("sha1")
    .update(CNPN_READ_RECEIPT_NAMESPACE)
    .update(eventId)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function isBrevoDuplicateIdempotencyError(error: unknown): Promise<boolean> {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const { response } = error as { response?: unknown };
  if (!(response instanceof Response) || response.status !== 400) return false;
  let payload: unknown = "data" in error ? error.data : undefined;
  if (!payload) {
    try {
      payload = await response.clone().json();
    } catch {
      return false;
    }
  }
  return (
    !!payload &&
    typeof payload === "object" &&
    "code" in payload &&
    payload.code === "duplicate_parameter"
  );
}

export async function sendCnpnEmailReadReceipt(
  to: string,
  context: { eventId: string; dossierId: number; originalSubject: string },
): Promise<BrevoSendResponse> {
  try {
    return await sendEmail({
      to: [to],
      subject: `Accusé de lecture de votre saisine CNPN - dossier ${context.dossierId}`,
      htmlContent: `<p>Le secrétariat du CNPN a ouvert le mail de saisine que vous avez envoyé via Pitchou pour le dossier ${context.dossierId}.</p><p><strong>Objet du mail :</strong> ${escapeHtml(context.originalSubject)}</p>`,
      tags: ["cnpn-read-receipt"],
      headers: { idempotencyKey: cnpnReadReceiptIdempotencyKey(context.eventId) },
    });
  } catch (error) {
    if (await isBrevoDuplicateIdempotencyError(error)) return { messageId: context.eventId };
    throw error;
  }
}
