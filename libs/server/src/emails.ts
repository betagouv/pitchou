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
}: {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  htmlContent: string;
  attachments?: { name: string; content: Buffer }[];
}): Promise<BrevoSendResponse> {
  return sendBrevoEmail({
    sender: PITCHOU_SENDER,
    to: to.map((email) => ({ email })),
    ...(cc.length > 0 ? { cc: cc.map((email) => ({ email })) } : {}),
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    subject,
    htmlContent,
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
