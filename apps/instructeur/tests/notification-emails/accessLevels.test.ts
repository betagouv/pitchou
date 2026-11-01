import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { setup, dispatch } from "./fixtures.ts";

async function directReader() {
  const fixture = await setup();
  const { actor, recipient } = fixture;
  await db("dossier_user_access").insert({
    dossier: actor.dossier.id,
    user_id: recipient.id,
    access_level: "read",
  });
  await db("auth_permission_exclusion").insert({
    user_id: recipient.id,
    permission: "dossier:instruct",
  });
  await db("user_groupe").where({ user_id: recipient.id }).delete();
  return fixture;
}

test("a direct full read-only follower without a group receives internal activity emails", async () => {
  const { actor, recipient, action } = await directReader();
  expect(
    await db("edge_personne_follows_dossier").where({
      personne: recipient.id,
      dossier: actor.dossier.id,
    }),
  ).toHaveLength(1);
  await action("commentaire_ajoute", { data: { excerpt: "Commentaire interne confidentiel" } });
  const row = await db("email_notification_outbox")
    .where({ personne: recipient.id, kind: "novelty" })
    .first();
  expect(row).toMatchObject({ status: "pending" });
  const { send } = await dispatch(row.due_at);
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0][0].to).toEqual([recipient.email]);
  expect(send.mock.calls[0][0].htmlContent).not.toContain("Commentaire interne confidentiel");
  expect(send.mock.calls[0][0].htmlContent).toContain("tab=historique");
});

test("revoking the last direct grant removes the follow and cancels queued delivery", async () => {
  const { actor, recipient, action } = await directReader();
  await action("commentaire_ajoute");
  const row = await db("email_notification_outbox")
    .where({ personne: recipient.id, kind: "novelty" })
    .first();
  await db("dossier_user_access")
    .where({ dossier: actor.dossier.id, user_id: recipient.id })
    .delete();
  expect(
    await db("edge_personne_follows_dossier").where({
      personne: recipient.id,
      dossier: actor.dossier.id,
    }),
  ).toHaveLength(0);
  expect((await dispatch(row.due_at)).send).not.toHaveBeenCalled();
  expect(await db("email_notification_outbox").where({ id: row.id }).first()).toMatchObject({
    status: "cancelled",
  });
});

test("a restricted downgrade preserves following and suppresses already queued internal activity", async () => {
  const { actor, recipient, action } = await setup();
  await action("commentaire_ajoute", { data: { excerpt: "Commentaire privé" } });
  const row = await db("email_notification_outbox")
    .where({ personne: recipient.id, kind: "novelty" })
    .first();
  await db("groupe_dossier_override").insert({
    dossier: actor.dossier.id,
    groupe_instructeurs: actor.groupeId,
    mode: "exclude",
  });
  expect(
    await db("edge_personne_follows_dossier").where({
      personne: recipient.id,
      dossier: actor.dossier.id,
    }),
  ).toHaveLength(1);
  expect((await dispatch(row.due_at)).send).not.toHaveBeenCalled();
  expect(await db("email_notification_outbox").where({ id: row.id }).first()).toMatchObject({
    status: "cancelled",
  });
  expect(
    await db("email_notification_history").where({ notification_id: row.id, event: "cancelled" }),
  ).not.toHaveLength(0);
});

test.each(["applicant", "phase"])(
  "restricted followers receive visible %s changes without internal history links",
  async (kind) => {
    const { actor, recipient, action } = await setup();
    await db("groupe_dossier_override").insert({
      dossier: actor.dossier.id,
      groupe_instructeurs: actor.groupeId,
      mode: "exclude",
    });
    if (kind === "applicant") {
      await action("champ_modifie", {
        author_personne: null,
        author_petitionnaire: true,
        data: { field: "Description", notification: true },
      });
    } else {
      await action("phase_renseignee", { data: { phase: "Instruction" } });
    }
    const row = await db("email_notification_outbox")
      .where({ personne: recipient.id, kind: "novelty" })
      .first();
    expect(row).toMatchObject({ status: "pending" });
    const { send } = await dispatch(row.due_at);
    const delivered = send.mock.calls
      .map(([message]) => message)
      .find(({ to }) => to.includes(recipient.email));
    expect(delivered?.htmlContent).toContain("tab=detail-du-projet");
    expect(delivered?.htmlContent).not.toContain("tab=historique");
  },
);

test("restricted followers do not enqueue new private comment or saisine notifications", async () => {
  const { actor, recipient, action } = await setup();
  await db("groupe_dossier_override").insert({
    dossier: actor.dossier.id,
    groupe_instructeurs: actor.groupeId,
    mode: "exclude",
  });
  await action("commentaire_ajoute", { data: { excerpt: "Privé" } });
  await action("saisine_importee");
  expect(
    await db("email_notification_outbox").where({ personne: recipient.id, kind: "novelty" }),
  ).toHaveLength(0);
});
