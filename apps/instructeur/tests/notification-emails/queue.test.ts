import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import { updateDossierFollowers } from "@pitchou/server/database/relation_suivi.ts";
import { emailNotificationPreferencesForUser } from "@pitchou/server/database/email_notification_preferences.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";

import { setup, dispatch } from "./fixtures.ts";

test("preferences default to enabled, persist independently and belong to the authenticated account", async () => {
  const { actor, recipient } = await setup();
  expect(await emailNotificationPreferencesForUser(actor.id as UserId, undefined, db)).toEqual({
    assignment: true,
    novelty: true,
    arrival: true,
  });
  await emailNotificationPreferencesForUser(
    recipient.id as UserId,
    { assignment: false, novelty: true, arrival: true },
    db,
  );
  expect(await emailNotificationPreferencesForUser(recipient.id as UserId, undefined, db)).toEqual({
    assignment: false,
    novelty: true,
    arrival: true,
  });
  expect(await emailNotificationPreferencesForUser(actor.id as UserId, undefined, db)).toEqual({
    assignment: true,
    novelty: true,
    arrival: true,
  });
});

test("aggregates third-party changes per followed dossier, sends at the due time once", async () => {
  const { action, recipient } = await setup();
  await action("avis_modifie");
  await action("controle_modifie");
  await action("piece_jointe_importee");
  const [queued] = await db("email_notification_outbox");
  expect(await db("email_notification_outbox")).toHaveLength(1);
  expect(queued.personne).toBe(recipient.id);
  expect(queued.kind).toBe("novelty");
  const parisTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(queued.due_at);
  expect(parisTime).toBe("06:00");
  expect((await dispatch(new Date(queued.due_at.getTime() - 1))).send).not.toHaveBeenCalled();
  const sent = await dispatch(queued.due_at);
  expect(sent.send).toHaveBeenCalledOnce();
  expect(sent.send.mock.calls[0][0]).toMatchObject({
    to: [recipient.email],
    subject: expect.stringContaining("Nouveauté:"),
    htmlContent: expect.stringContaining("https://pitchou.test/parametres/notifications"),
  });
  expect(
    (await dispatch(new Date(queued.due_at.getTime() + 86400000))).send,
  ).not.toHaveBeenCalled();
});

test("excludes own changes, generated documents, follow events, unknown system actions and no-op writes", async () => {
  const { action, recipient, actor } = await setup();
  await db("edge_personne_follows_dossier").where({ personne: recipient.id }).delete();
  for (const type of [
    "avis_modifie",
    "document_genere",
    "dossier_suivi",
    "dossier_suivi_termine",
    "system_action",
  ])
    await action(type);
  await action("champ_modifie", { author_personne: null, author_petitionnaire: true, data: {} });
  await db("edge_personne_follows_dossier").insert({
    personne: recipient.id,
    dossier: actor.dossier.id,
  });
  await action("controle_modifie", { data: { email_notification: false } });
  expect(await db("email_notification_outbox")).toHaveLength(0);
});

test("DN form, attachment and species changes queue mail, but deferred baselines and rollback do not", async () => {
  const { action, actor } = await setup();
  await db.transaction(async (trx) => {
    await logActionsDossier(
      [
        {
          dossier: actor.dossier.id as ActionDossierInitializer["dossier"],
          type: "piece_jointe_importee",
          author_petitionnaire: true,
          data: { notification: true },
        },
      ],
      trx,
    );
    await trx("action_dossier").update({ data: JSON.stringify({ baseline: true }) });
  });
  expect(await db("email_notification_outbox")).toHaveLength(0);
  await expect(
    db.transaction(async (trx) => {
      await logActionsDossier(
        [
          {
            dossier: actor.dossier.id as ActionDossierInitializer["dossier"],
            type: "avis_modifie",
            author_personne: actor.id as ActionDossierInitializer["author_personne"],
          },
        ],
        trx,
      );
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(await db("email_notification_outbox")).toHaveLength(0);
  for (const type of ["champ_modifie", "especes_renseignees", "piece_jointe_importee"])
    await action(type, {
      author_personne: null,
      author_petitionnaire: true,
      data: { notification: true },
    });
  expect(await db("email_notification_outbox")).toHaveLength(2);
});

test("queues immediate assignments only for newly added third-party followers", async () => {
  const { actor, recipient, action } = await setup();
  await db("edge_personne_follows_dossier").where({ personne: recipient.id }).delete();
  const assign = async () =>
    db.transaction(async (trx) => {
      const updated = await updateDossierFollowers(
        actor.id as UserId,
        actor.dossier.id as ActionDossierInitializer["dossier"],
        [actor.email, recipient.email],
        trx,
      );
      if (updated)
        await logActionsDossier(
          updated.added.map((follower) => ({
            dossier: actor.dossier.id as ActionDossierInitializer["dossier"],
            type: "dossier_suivi",
            author_personne: actor.id as ActionDossierInitializer["author_personne"],
            data: { follower },
          })),
          trx,
        );
    });
  await assign();
  await assign();
  await action("dossier_suivi", { data: { follower: actor.email } });
  expect(await db("email_notification_outbox")).toHaveLength(1);
  const sent = await dispatch(new Date());
  expect(sent.send).toHaveBeenCalledOnce();
  expect(sent.send.mock.calls[0][0].subject).toContain("Attribution dossier:");
});

test.each(["preference", "unfollow", "access"])("rechecks %s before delivery", async (change) => {
  const { action, recipient } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  if (change === "preference")
    await db("email_notification_preferences")
      .where({ personne: recipient.id })
      .update({ novelty: false, arrival: true });
  if (change === "unfollow")
    await db("edge_personne_follows_dossier").where({ personne: recipient.id }).delete();
  if (change === "access") await db("user_groupe").where({ user_id: recipient.id }).delete();
  expect((await dispatch(row.due_at)).send).not.toHaveBeenCalled();
  expect((await db("email_notification_outbox").first()).status).toBe("cancelled");
});

test("disabled categories do not queue and are independent", async () => {
  const { action, recipient } = await setup();
  await db("email_notification_preferences")
    .where({ personne: recipient.id })
    .update({ novelty: false, arrival: true });
  await action("avis_modifie");
  await action("dossier_suivi", { data: { follower: recipient.email } });
  expect((await db("email_notification_outbox")).map((r) => r.kind)).toEqual(["assignment"]);
});
