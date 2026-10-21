import ky from "ky";
import type { BrevoSendResponse } from "../emails.ts";
import { captureEmail } from "./capture.ts";

const BREVO_EMAIL_SEND_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
export const EMAIL_ENVIRONMENT_TAG_PREFIX = "pitchou-env-";

export function getEmailEnvironmentTag(): string {
  const environment =
    process.env.PUBLIC_PITCHOU_ENV === "staging"
      ? "staging"
      : process.env.NODE_ENV === "production"
        ? "production"
        : "development";
  return `${EMAIL_ENVIRONMENT_TAG_PREFIX}${environment}`;
}

export function sendBrevoEmail({
  tags = [],
  ...payload
}: Record<string, unknown> & { tags?: string[] }): Promise<BrevoSendResponse> {
  const captured = captureEmail(payload, tags);
  if (captured) return captured;
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
      json: {
        ...payload,
        tags: [
          ...tags.filter((tag) => !tag.startsWith(EMAIL_ENVIRONMENT_TAG_PREFIX)),
          getEmailEnvironmentTag(),
        ],
      },
    })
    .json<BrevoSendResponse>();
}
