import { listDossierUserAccess } from "@pitchou/server/administration/dossierAccess.ts";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import { changeAssignments, changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { expect, test } from "vitest";
import { createDossier } from "../factories/index.ts";
import { dispatch, setup } from "./fixtures.ts";

test("an instruction grant on another dossier does not promote a direct read grant", async () => {
  const { actor, recipient } = await setup();
  const other = await createDossier(db);
  await changeDossierAccess(db, async (trx) => {
    await trx("dossier_user_access").insert([
      { dossier: actor.dossier.id, user_id: recipient.id, access_level: "read" },
      { dossier: other.id, user_id: recipient.id, access_level: "instruct" },
    ]);
    await trx("user_groupe").where({ user_id: recipient.id }).delete();
  });
  const access = await dossiersAccessibleToUser(
    [actor.dossier.id as DossierId, other.id as DossierId],
    recipient.id as UserId,
    db,
  );
  expect(access.get(actor.dossier.id as DossierId)).toBe("lecture_complete");
  expect(access.get(other.id as DossierId)).toBe("complet");
  const { grants } = await listDossierUserAccess(actor.dossier.id, db);
  expect(grants).toMatchObject([{ user_id: recipient.id, effective_access: "lecture_complete" }]);
});

test("an unrelated direct grant does not queue private activity for a restricted follower", async () => {
  const { actor, recipient, action } = await setup();
  const other = await createDossier(db);
  await changeDossierAccess(db, (trx) =>
    trx("dossier_user_access").insert({
      dossier: other.id,
      user_id: recipient.id,
      access_level: "instruct",
    }),
  );
  await changeAssignments(db, (trx) =>
    trx("dossier_group_override").insert({
      dossier: actor.dossier.id,
      groupe_instructeurs: actor.groupeId,
      mode: "exclude",
    }),
  );
  expect(
    (await dossiersAccessibleToUser(actor.dossier.id as DossierId, recipient.id as UserId, db)).get(
      actor.dossier.id as DossierId,
    ),
  ).toBe("lecture");
  expect(
    await db("edge_personne_follows_dossier").where({
      dossier: actor.dossier.id,
      personne: recipient.id,
    }),
  ).toHaveLength(1);
  await action("commentaire_ajoute");
  expect(
    await db("email_notification_outbox").where({ dossier: actor.dossier.id, kind: "novelty" }),
  ).toEqual([]);
});

test.each(["instruct", "read"])(
  "decision deletion notifies a %s follower, excluding its author",
  async (level) => {
    const { actor, recipient, action } = await setup();
    if (level === "read")
      await changeDossierAccess(db, (trx) =>
        trx("auth_permission_exclusion").insert({
          user_id: recipient.id,
          permission: "dossier:instruct",
        }),
      );
    await action("decision_supprimee");
    const queued = await db("email_notification_outbox").where({
      dossier: actor.dossier.id,
      kind: "novelty",
    });
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ personne: recipient.id, status: "pending" });
    const { send } = await dispatch(queued[0].due_at);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].to).toEqual([recipient.email]);
  },
);
