import { createHash } from "node:crypto";
import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
import {
  sendEmail,
  isBrevoDuplicateIdempotencyError,
  isDefinitiveEmailSendFailure,
  type EmailMessage,
} from "../emails.ts";
import { assertStagingRecipients, StagingEmailSuppressedError } from "./recipients.ts";

export const TECH_EMAIL = "tech@pitchou.beta.gouv.fr";
export const ISSUE_NOTIFICATION_TAG = "pitchou-email-issue";

export type EmailIssue = {
  key: string;
  environment: string;
  type: string;
  recipient: string;
  subject: string;
  reason: string;
  occurredAt: Date | string;
  providerMessageId?: string;
};

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export async function reportEmailIssue(
  issue: EmailIssue,
  options: { db?: Knex; send?: (message: EmailMessage) => Promise<unknown> } = {},
): Promise<"processed" | "retry"> {
  // Test servers must not send alerts either. Staging retains its exact-address allowlist.
  if (process.env.PITCHOU_EMAIL_DELIVERY_DISABLED === "true") return "processed";
  try {
    assertStagingRecipients([TECH_EMAIL]);
  } catch (error) {
    if (!(error instanceof StagingEmailSuppressedError)) throw error;
    console.error("Technical email alert suppressed by staging allowlist");
    return "processed";
  }
  const db = options.db ?? directDatabaseConnection;
  const id = createHash("sha256").update(`${issue.environment}:${issue.key}`).digest("hex");
  const claimedAt = new Date();
  const claimed = await claimIssue(db, id, issue, claimedAt);
  if (claimed === "sent") return "processed";
  if (claimed === "uncertain") {
    console.error("Technical email alert needs reconciliation after the deduplication window", id);
    return "processed";
  }
  if (claimed === "busy") return "retry";
  try {
    try {
      await (options.send ?? sendEmail)(issueMessage(issue, id));
    } catch (error) {
      if (!(await isBrevoDuplicateIdempotencyError(error))) throw error;
    }
    await db("email_issue_notification")
      .where({ id, claimed_at: claimedAt })
      .update({ sent_at: db.fn.now(), claimed_at: null });
  } catch (error) {
    if (isDefinitiveEmailSendFailure(error)) {
      // Clear only an anchor created by this attempt, never an earlier ambiguous attempt.
      await db("email_issue_notification")
        .where({ id, claimed_at: claimedAt, first_attempt_at: claimedAt })
        .whereNull("sent_at")
        .update({ first_attempt_at: null });
    }
    await db("email_issue_notification")
      .where({ id, claimed_at: claimedAt })
      .update({ claimed_at: null })
      .catch(() => {});
    throw error;
  }
  return "processed";
}

async function claimIssue(db: Knex, id: string, issue: EmailIssue, claimedAt: Date) {
  return db.transaction(async (trx) => {
    await trx("email_issue_notification")
      .insert({ id, issue: JSON.stringify(issue) })
      .onConflict("id")
      .ignore();
    const row = await trx("email_issue_notification").where({ id }).forUpdate().first();
    if (row.sent_at) return "sent";
    if (row.claimed_at && +new Date(row.claimed_at) >= +claimedAt - 5 * 60_000) return "busy";
    if (
      row.uncertain_at ||
      (row.first_attempt_at && +claimedAt - +new Date(row.first_attempt_at) >= 25 * 60_000)
    ) {
      await trx("email_issue_notification")
        .where({ id })
        .update({ uncertain_at: row.uncertain_at ?? claimedAt, claimed_at: null });
      return "uncertain";
    }
    const rows = await trx("email_issue_notification")
      .where({ id })
      .whereNull("sent_at")
      .andWhere((query) =>
        query.whereNull("claimed_at").orWhere("claimed_at", "<", new Date(+claimedAt - 5 * 60_000)),
      )
      .update({ claimed_at: claimedAt, first_attempt_at: row.first_attempt_at ?? claimedAt })
      .returning("id");
    if (rows.length > 0) return "claimed";
    return (await trx("email_issue_notification").where({ id }).first("sent_at"))?.sent_at
      ? "sent"
      : "busy";
  });
}

function issueMessage(issue: EmailIssue, id: string): EmailMessage {
  const fields = [
    ["Événement", issue.type],
    ["Destinataire", issue.recipient],
    ["Objet", issue.subject],
    ["Motif", issue.reason],
    ["Date", new Date(issue.occurredAt).toISOString()],
    ["Identifiant Brevo", issue.providerMessageId ?? "Non disponible"],
  ];
  return {
    to: [TECH_EMAIL],
    subject: `[Pitchou ${issue.environment}] Problème d'envoi de mail`,
    htmlContent: `<p>Un problème a été signalé pour un mail Pitchou.</p><dl>${fields.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`,
    tags: [ISSUE_NOTIFICATION_TAG],
    headers: {
      idempotencyKey: `${id.slice(0, 8)}-${id.slice(8, 12)}-5${id.slice(13, 16)}-a${id.slice(17, 20)}-${id.slice(20, 32)}`,
    },
  };
}

export async function retryEmailIssues(
  options: Parameters<typeof reportEmailIssue>[1] & { dryRun?: boolean } = {},
) {
  const db = options.db ?? directDatabaseConnection;
  const { getEmailEnvironmentTag } = await import("./delivery.ts");
  const rows = await db("email_issue_notification")
    .whereNull("sent_at")
    .whereNull("uncertain_at")
    .whereRaw("issue->>'environment' = ?", [getEmailEnvironmentTag()])
    .orderBy("created_at")
    .limit(100)
    .select("issue");
  if (options.dryRun) return { candidates: rows.length };
  let failed = 0;
  for (const { issue } of rows) {
    try {
      await reportEmailIssue(issue as EmailIssue, options);
    } catch {
      failed++;
      console.error("Technical email alert retry failed");
    }
  }
  return { candidates: rows.length, failed };
}
