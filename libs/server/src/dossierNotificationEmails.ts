import type { Knex } from "knex";
import { directDatabaseConnection } from "./database.ts";
import { sendEmail, isBrevoDuplicateIdempotencyError, type EmailMessage } from "./emails.ts";
import { claimEmail, dueEmails } from "./dossierNotificationEmails/queue.ts";
import {
  notificationErrorCategory,
  providerMessageId,
} from "./dossierNotificationEmails/failures.ts";

function definitelyRejected(error: unknown): boolean {
  if (error instanceof Error && error.message === "Missing BREVO_API_KEY environment variable")
    return true;
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = error.response;
  return (
    response instanceof Response &&
    response.status >= 400 &&
    response.status < 500 &&
    response.status !== 408
  );
}

export async function dispatchDossierNotificationEmails(
  options: {
    db?: Knex;
    now?: Date;
    dossier?: number;
    kind?: "assignment" | "novelty" | "arrival";
    send?: (message: EmailMessage) => Promise<unknown>;
    siteUrl?: string;
    dryRun?: boolean;
  } = {},
) {
  const db = options.db ?? directDatabaseConnection;
  const now = options.now ?? new Date();
  const siteUrl = options.siteUrl ?? process.env.PUBLIC_SITE_URL_PITCHOU;
  if (!siteUrl) throw new Error("Missing PUBLIC_SITE_URL_PITCHOU environment variable");
  const candidates = await dueEmails(db, now, options.dossier, options.kind)
    .select("id", "dossier", "personne", "kind")
    .orderBy("due_at")
    .limit(100);
  if (options.dryRun) return { dryRun: true, candidates };
  let sent = 0;
  let failed = 0;
  for (const { id } of candidates) {
    const row = await claimEmail(db, id, now, siteUrl);
    if (!row?.message) continue;
    try {
      let result: unknown;
      try {
        result = await (options.send ?? sendEmail)(row.message);
      } catch (error) {
        if (!(await isBrevoDuplicateIdempotencyError(error))) throw error;
      }
      await db("email_notification_outbox")
        .where({ id, claimed_at: now })
        .update({
          status: "sent",
          sent_at: now,
          claimed_at: null,
          last_error: null,
          provider_message_id: providerMessageId(result),
        });
      sent++;
    } catch (error) {
      failed++;
      await db("email_notification_outbox")
        .where({ id, claimed_at: now })
        .update({
          claimed_at: null,
          retry_at: new Date(now.getTime() + 60_000),
          // Only an explicit rejection permits a later retry outside the TTL.
          ...(definitelyRejected(error) ? { first_attempt_at: null } : {}),
          last_error: notificationErrorCategory(error),
        });
      console.error("Dossier notification email failed", id);
    }
  }
  return { sent, failed };
}

export async function dispatchAssignmentEmailsAfterCommit(dossier: number): Promise<void> {
  try {
    await dispatchDossierNotificationEmails({ dossier });
  } catch (error) {
    // The assignment is committed. The worker will retry the durable outbox.
    console.error(
      "Assignment notification dispatch failed",
      dossier,
      error instanceof Error ? error.name : "Error",
    );
  }
}

export async function dispatchArrivalEmailsAfterCommit(dossier?: number): Promise<void> {
  try {
    await dispatchDossierNotificationEmails({ dossier, kind: "arrival" });
  } catch (error) {
    console.error(
      "Arrival notification dispatch failed",
      dossier,
      error instanceof Error ? error.name : "Error",
    );
  }
}
