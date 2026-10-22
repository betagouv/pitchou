import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";
import { captureEmail } from "@pitchou/server/emails/capture.ts";
import type { EmailMessage } from "@pitchou/server/emails.ts";
import { createScenario, type Identities } from "./fixtures.ts";

async function localSend(message: EmailMessage) {
  const promise = captureEmail(
    {
      sender: { name: "Pitchou", email: "contact@pitchou.beta.gouv.fr" },
      to: message.to.map((email) => ({ email })),
      subject: message.subject,
      htmlContent: message.htmlContent,
      headers: message.headers,
    },
    [...(message.tags ?? []), "recette-suivi-2542"],
  );
  if (!promise) throw new Error("Local capture required");
  return promise;
}

export async function prepareScenario(
  label: string,
  kind: string,
  outcome: string,
  identities: Identities,
) {
  const scenario = await createScenario(label, kind, identities);
  if (!scenario.fresh) return { label, dossier: scenario.dossier.id };
  const target = db("email_notification_outbox").where({
    dossier: scenario.dossier.id,
    personne: identities.recipient.id,
  });
  const [row] = await target;
  if (!row) throw new Error(`No notification queued for ${label}`);
  const now = new Date();
  const dispatch = (time: Date, send: (message: EmailMessage) => Promise<unknown>) =>
    dispatchDossierNotificationEmails({
      db,
      now: time,
      dossier: scenario.dossier.id,
      kind: kind as "arrival" | "assignment" | "novelty",
      send,
      siteUrl: process.env.PUBLIC_SITE_URL_PITCHOU,
    });
  if (outcome === "sent") {
    await target.update({ due_at: now });
    await dispatch(now, localSend);
  } else if (outcome === "retry" || outcome === "uncertain") {
    await target.update({ due_at: now });
    await dispatch(now, async () => {
      if (outcome === "retry")
        throw Object.assign(new Error("Simulated rate limit"), {
          response: new Response(null, { status: 429 }),
        });
      throw new Error("Simulated ambiguous result");
    });
    if (outcome === "uncertain") await dispatch(new Date(now.getTime() + 26 * 60000), localSend);
    else await target.update({ retry_at: new Date(now.getTime() + 86400000) });
  } else if (outcome === "cancelled") {
    await db("edge_personne_follows_dossier")
      .where({ dossier: scenario.dossier.id, personne: identities.recipient.id })
      .delete();
  } else if (outcome === "overdue") {
    await target.update({
      due_at: new Date(now.getTime() - 86400000),
      retry_at: new Date(now.getTime() + 86400000),
    });
  }
  return { label, dossier: scenario.dossier.id };
}
