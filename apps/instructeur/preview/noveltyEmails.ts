import type { Knex } from "knex";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";
import type { EmailMessage } from "@pitchou/server/emails.ts";
import { localInboxUrl } from "./environment.ts";

async function captureEmail(inbox: URL, message: EmailMessage) {
  const response = await fetch(
    new URL("api/v1/send", inbox.href.endsWith("/") ? inbox : `${inbox}/`),
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: "contact@pitchou.beta.gouv.fr", Name: "Pitchou" },
        To: message.to.map((Email) => ({ Email })),
        Subject: message.subject,
        HTML: message.htmlContent,
        Tags: message.tags,
        Headers: message.headers,
      }),
    },
  );
  if (!response.ok)
    throw Object.assign(new Error("Local inbox rejected the message"), { response });
  const result = await response.json();
  if (typeof result.ID !== "string" || !result.ID) throw new Error("Invalid local inbox response");
  return { messageId: result.ID };
}

export async function deliverPreviewNoveltyEmails({
  inboxUrl,
  siteUrl,
  db = directDatabaseConnection,
}: {
  inboxUrl: string;
  siteUrl: string;
  db?: Knex;
}) {
  const inbox = localInboxUrl(inboxUrl);
  const now = new Date();
  // Free the calendar batch key before delivery so a later real change can queue
  // another preview batch. Sent rows keep their identity and are never replayed.
  await db("email_notification_outbox")
    .where({ kind: "novelty", status: "pending" })
    .whereNull("claimed_at")
    .whereNull("first_attempt_at")
    .update({
      batch_key: db.raw("'fleet-preview:' || id::text"),
      due_at: db.raw("LEAST(due_at, ?)", [now]),
    });
  return dispatchDossierNotificationEmails({
    db,
    now,
    kind: "novelty",
    siteUrl,
    send: (message) => captureEmail(inbox, message),
  });
}
