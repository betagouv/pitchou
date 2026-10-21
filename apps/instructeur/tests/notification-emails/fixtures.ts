import { vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";
import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import {
  createInstructeurWithDossier,
  createPersonne,
  createCapDossier,
  attachCapToGroupe,
} from "../factories/index.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";

export async function setup() {
  const actor = await createInstructeurWithDossier(db, { email: "actor@test.fr" });
  const recipient = await createPersonne(db, { email: "recipient@test.fr" });
  const { cap } = await createCapDossier(db, recipient.codeAcces);
  await attachCapToGroupe(db, cap, actor.groupeId);
  await db("edge_personne_follows_dossier").insert([
    { dossier: actor.dossier.id, personne: actor.id },
    { dossier: actor.dossier.id, personne: recipient.id },
  ]);
  // These fixtures exercise assignment/novelty behavior after the dossier has arrived.
  if (await db.schema.hasTable("email_notification_outbox"))
    await db("email_notification_outbox").where({ kind: "arrival" }).delete();
  const action = (type: string, extra: Partial<ActionDossierInitializer> = {}) =>
    logActionsDossier(
      [
        {
          dossier: actor.dossier.id as ActionDossierInitializer["dossier"],
          type,
          author_personne: actor.id as ActionDossierInitializer["author_personne"],
          ...extra,
        },
      ],
      db,
    );
  return { actor, recipient: { ...recipient, cap }, action };
}
export async function dispatch(
  now: Date,
  send = vi.fn().mockResolvedValue({ messageId: "simulated" }),
) {
  const result = await dispatchDossierNotificationEmails({
    db,
    now,
    send,
    siteUrl: "https://pitchou.test",
  });
  return { result, send };
}
