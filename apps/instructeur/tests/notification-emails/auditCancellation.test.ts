import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { setup, dispatch } from "./fixtures.ts";
import { setupArrival } from "./arrivalFixtures.ts";

test.each(["disabled_preference", "unfollowed_dossier", "lost_access"])(
  "records cancellation reason %s exactly once",
  async (reason) => {
    const { action, recipient, actor } = await setup();
    await action("avis_modifie");
    const [row] = await db("email_notification_outbox");
    if (reason === "disabled_preference")
      await db("email_notification_preferences")
        .where({ personne: recipient.id })
        .update({ novelty: false });
    if (reason === "unfollowed_dossier")
      await db("edge_personne_follows_dossier")
        .where({ personne: recipient.id, dossier: actor.dossier.id })
        .delete();
    if (reason === "lost_access")
      await db("edge_cap_dossier__groupe_instructeurs")
        .where({ cap_dossier: recipient.cap })
        .delete();
    await dispatch(row.due_at);
    await dispatch(row.due_at);
    expect((await db("email_notification_outbox").first()).cancellation_reason).toBe(reason);
    const events = await db("evenement_metrique")
      .where({ evenement: "notificationEmailCancelled" })
      .whereRaw("details->>'notificationId' = ?", [row.id]);
    expect(events).toHaveLength(1);
    expect(events[0].details.reason).toBe(reason);
  },
);

test("a group transfer keeps the cancellation of the previous group's pending arrival", async () => {
  const { arrive, dossier, outsider } = await setupArrival();
  await arrive();
  await db("edge_groupe_instructeurs__dossier")
    .where({ dossier: dossier.id })
    .update({ groupe_instructeurs: outsider.groupeId });
  const cancelled = await db("email_notification_outbox").where({ status: "cancelled" });
  expect(cancelled).toHaveLength(2);
  expect(cancelled.every((row) => row.cancellation_reason === "transferred_group")).toBe(true);
  expect(await db("email_notification_history").where({ event: "cancelled" })).toHaveLength(2);
});

test("history survives a dossier cascade deletion and records why a pending email vanished", async () => {
  const { action, actor } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await db("dossier").where({ id: actor.dossier.id }).delete();
  expect(await db("email_notification_outbox")).toHaveLength(0);
  const events = await db("email_notification_history").where({
    notification_id: row.id,
    event: "cancelled",
  });
  expect(events).toHaveLength(1);
  expect(events[0].details.reason).toBe("dossier_deleted");
});
