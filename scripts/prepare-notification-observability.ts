import { fileURLToPath } from "node:url";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { emailNotificationPreferencesFromCap } from "@pitchou/server/database/email_notification_preferences.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import { previewEnvironment } from "../apps/instructeur/preview/environment.ts";
import {
  prepareIdentities,
  grantOwnerAccess,
  prefix,
} from "./prepare-notification-observability/fixtures.ts";
import { prepareScenario } from "./prepare-notification-observability/scenarios.ts";

try {
  if (!previewEnvironment(fileURLToPath(new URL("../apps/instructeur", import.meta.url))))
    throw new Error("Run only in the isolated Fleet preview with local capture");
  const identities = await prepareIdentities();
  const cap = identities.recipient.cap as CapDossierCap;
  const initial = await emailNotificationPreferencesFromCap(cap, undefined, db);
  const disabled = { arrival: false, assignment: false, novelty: false };
  await emailNotificationPreferencesFromCap(identities.actor.cap as CapDossierCap, disabled, db);
  if (
    !(await db("email_notification_settings_history")
      .where({ personne: identities.recipient.id })
      .first())
  ) {
    await emailNotificationPreferencesFromCap(cap, disabled, db);
    await emailNotificationPreferencesFromCap(cap, disabled, db);
  }
  await emailNotificationPreferencesFromCap(
    cap,
    { arrival: true, assignment: true, novelty: true },
    db,
  );
  const cases = [
    ["Arrivée acceptée", "arrival", "sent"],
    ["Attribution acceptée", "assignment", "sent"],
    ["Nouveauté acceptée", "novelty", "sent"],
    ["Échec, reprise différée", "assignment", "retry"],
    ["Envoi incertain", "assignment", "uncertain"],
    ["Annulé, suivi quitté", "novelty", "cancelled"],
    ["Nouveauté en retard", "novelty", "overdue"],
    ["Nouveauté prévue à 6 h", "novelty", "pending"],
  ];
  for (let n = 1; n <= 22; n++)
    cases.push([
      `Pagination ${String(n).padStart(2, "0")}`,
      ["arrival", "assignment", "novelty"][n % 3],
      "pending",
    ]);
  const results = [];
  for (const [label, kind, outcome] of cases)
    results.push(await prepareScenario(label, kind, outcome, identities));
  await grantOwnerAccess(identities.group.id);
  const rows = await db("email_notification_outbox as n")
    .join("dossier as d", "d.id", "n.dossier")
    .whereLike("d.name", `${prefix}%`)
    .select(
      "n.id",
      "n.kind",
      "n.status",
      "n.dossier",
      "n.attempt_count",
      "n.environment",
      "n.cancellation_reason",
      "n.last_error",
      "n.due_at",
      "n.provider_message_id",
    );
  console.log(
    JSON.stringify(
      {
        recipientId: identities.recipient.id,
        actorId: identities.actor.id,
        originalPreferences: initial,
        results,
        rows,
      },
      null,
      2,
    ),
  );
} finally {
  await db.destroy();
}
