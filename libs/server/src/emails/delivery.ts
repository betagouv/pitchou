import ky from "ky";
import { assertStagingEmailPayload } from "./recipients.ts";
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
  if (process.env.PITCHOU_EMAIL_DELIVERY_DISABLED === "true") {
    throw new Error("Email delivery is disabled in this environment");
  }
  const captured = captureEmail(payload, tags);
  if (captured) return captured;
  assertStagingEmailPayload(payload);
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
    .json<BrevoSendResponse>()
    .catch(async (error: unknown) => {
      if (!tags.includes("pitchou-email-issue") && process.env.NODE_ENV !== "test") {
        try {
          const { reportBrevoSendFailure } = await import("./sendFailure.ts");
          await reportBrevoSendFailure(payload, error);
        } catch {
          console.error("Technical email alert could not be sent");
        }
      }
      throw error;
    });
}
