import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";
import { previewEnvironment } from "../apps/instructeur/preview/environment.ts";
import { createScenario, grantOwnerAccess } from "./prepare-notification-observability/fixtures.ts";

try {
  const preview = previewEnvironment(
    fileURLToPath(new URL("../apps/instructeur", import.meta.url)),
  );
  if (!preview) throw new Error("Run only in this isolated Fleet preview");
  const identities = await db.transaction(async (trx) => {
    const name = "Recette reprise 2542";
    let group = await trx("groupe_instructeurs").where({ name }).first();
    if (!group)
      [group] = await trx("groupe_instructeurs")
        .insert({ name, demarche_number: 88444 })
        .returning("*");
    const people = [];
    for (const role of ["actor", "recipient"]) {
      const email = `retry-2542-${role}@recette.example`;
      let person = await trx("personne").where({ email }).first();
      if (!person)
        [person] = await trx("personne")
          .insert({
            email,
            access_code: randomUUID(),
            first_names: "Recette reprise 2542",
            last_name: role,
          })
          .returning("*");
      let cap = await trx("cap_dossier").where({ personne_cap: person.access_code }).first();
      if (!cap)
        [cap] = await trx("cap_dossier")
          .insert({ personne_cap: person.access_code })
          .returning("*");
      await trx("edge_cap_dossier__groupe_instructeurs")
        .insert({ cap_dossier: cap.cap, groupe_instructeurs: group.id })
        .onConflict()
        .ignore();
      people.push({ ...person, cap: cap.cap });
    }
    return { group, actor: people[0], recipient: people[1] };
  });
  await grantOwnerAccess(identities.group.id);
  const { dossier } = await createScenario(
    "Régression réponse perdue puis 429",
    "assignment",
    identities,
  );
  const target = () =>
    db("email_notification_outbox").where({
      dossier: dossier.id,
      personne: identities.recipient.id,
      kind: "assignment",
    });
  let row = await target().first();
  assert.ok(row, "Scenario must queue an assignment");
  if (row.status === "pending" && row.attempt_count === 0) {
    await target().update({ due_at: new Date() });
    row = await target().first();
  }
  const start = row.first_attempt_at ?? row.due_at;
  let calls = 0;
  const dispatch = (minutes: number, send: () => Promise<never>) =>
    dispatchDossierNotificationEmails({
      db,
      dossier: dossier.id,
      kind: "assignment",
      now: new Date(start.getTime() + minutes * 60_000),
      siteUrl: preview.siteUrl,
      send: async () => {
        calls++;
        return send();
      },
    });
  if (row.status === "pending" && row.attempt_count === 0) {
    await dispatch(0, async () => {
      throw Object.assign(new Error("Simulated lost response"), { name: "TimeoutError" });
    });
    row = await target().first();
  }
  if (row.status === "pending" && row.attempt_count === 1) {
    await dispatch(10, async () => {
      throw Object.assign(new Error("Simulated rate limit"), {
        response: new Response(null, { status: 429 }),
      });
    });
    row = await target().first();
    assert.equal(row.first_attempt_at.getTime(), start.getTime());
  }
  const before = calls;
  await dispatch(40, async () => {
    throw new Error("Unexpected third provider call");
  });
  assert.equal(calls, before, "No provider call after the ambiguous attempt safety window");
  row = await target().first();
  assert.equal(row.status, "uncertain");
  assert.equal(row.attempt_count, 2);
  assert.equal(row.environment, "preview");
  const history = await db("email_notification_history")
    .where({ notification_id: row.id })
    .orderBy("occurred_at");
  assert.deepEqual(
    history.map((event) => event.event),
    ["queued", "attempted", "failed", "attempted", "failed", "uncertain"],
  );
  const metrics = await db("evenement_metrique")
    .whereRaw("details->>'notificationId' = ?", [row.id])
    .orderBy("date");
  assert.equal(
    metrics.filter((event) => event.evenement === "notificationEmailUncertain").length,
    1,
  );
  assert.equal(metrics.filter((event) => event.evenement === "notificationEmailSent").length, 0);
  console.log(
    JSON.stringify(
      {
        dossier: dossier.id,
        name: dossier.name,
        notification: row.id,
        recipient: identities.recipient.id,
        actor: identities.actor.id,
        status: row.status,
        attempts: row.attempt_count,
        anchor: row.first_attempt_at,
        error: row.last_error,
        history: history.map(({ id, event, attempt, details }) => ({
          id,
          event,
          attempt,
          details,
        })),
        analytics: metrics.map(({ id, evenement }) => ({ id, evenement })),
      },
      null,
      2,
    ),
  );
} finally {
  await db.destroy();
}
