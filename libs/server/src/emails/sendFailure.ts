import { createHash } from "node:crypto";
import { reportEmailIssue } from "./issues.ts";
import { getEmailEnvironmentTag } from "./delivery.ts";
import { isBrevoDuplicateIdempotencyError } from "../emails.ts";
import { notificationErrorCategory } from "../dossierNotificationEmails/failures.ts";

export async function reportBrevoSendFailure(payload: Record<string, unknown>, error: unknown) {
  if (await isBrevoDuplicateIdempotencyError(error)) return;
  const recipients = [payload.to, payload.cc, payload.bcc].flatMap((addresses) =>
    Array.isArray(addresses)
      ? addresses.flatMap((address) => (typeof address?.email === "string" ? [address.email] : []))
      : [],
  );
  const subject = typeof payload.subject === "string" ? payload.subject : "Modèle transactionnel";
  const headers = payload.headers as Record<string, string> | undefined;
  // Stable notification keys deduplicate retries. Template sends have no stored request ID.
  const key =
    headers?.idempotencyKey ??
    createHash("sha256")
      .update(JSON.stringify([recipients, subject, Math.floor(Date.now() / 3_600_000)]))
      .digest("hex");
  await reportEmailIssue({
    key: `send:${key}`,
    environment: getEmailEnvironmentTag(),
    type: "send_error",
    recipient: recipients.join(", "),
    subject,
    // Do not put raw provider errors, message bodies or login links in technical alerts.
    reason: notificationErrorCategory(error),
    occurredAt: new Date(),
  });
}
