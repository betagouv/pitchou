import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import { changeAssignments, changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import { dossierAccessSql } from "@pitchou/server/dossierRouting/access.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { createDossier, createGroupeInstructeurs } from "../factories/dossier.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";
import { truncateAll } from "../setup/truncate.ts";

let fixture: Awaited<ReturnType<typeof disposableAccessDatabase>>;
beforeAll(async () => {
  fixture = await disposableAccessDatabase();
}, 60_000);
afterAll(async () => {
  if (fixture) await fixture.close();
});
beforeEach(async () => truncateAll(fixture.db));
const access = async (dossier: number, user: UserId) => {
  const value = (await dossiersAccessibleToUser(dossier as Dossier["id"], user, fixture.db)).get(
    dossier as Dossier["id"],
  );
  const { rows } = await fixture.db.raw(
    `SELECT ${dossierAccessSql("input.dossier", "input.user_id")} AS access FROM (SELECT ?::integer dossier, ?::integer user_id) input`,
    [dossier, user],
  );
  expect(value).toBe(rows[0].access ?? undefined);
  return value;
};
async function reader() {
  const { db } = fixture;
  const [user] = await db("auth_user").insert({ email: "read@example.org" }).returning("id");
  await db("auth_permission").insert({ user_id: user.id, permission: "dossier:read" });
  return user.id as UserId;
}

test("downgrades preserve follows and notification revisions until all reading access disappears", async () => {
  const { db } = fixture;
  const user = await reader();
  const group = await createGroupeInstructeurs(db);
  await db("user_groupe").insert({ user_id: user, groupe_instructeurs: group.id });
  const dossier = await createDossier(db, { primary_department: "75" });
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_departement").insert({ groupe_instructeurs: group.id, department: "75" }),
    { silent: true },
  );
  await db("edge_personne_follows_dossier").insert({ dossier: dossier.id, personne: user });
  const before = await db("notification").where({ dossier: dossier.id, personne: user }).first();
  await changeAssignments(db, (routingTrx) =>
    routingTrx("groupe_dossier_override").insert({
      dossier: dossier.id,
      groupe_instructeurs: group.id,
      mode: "include",
      access_level: "read",
    }),
  );
  expect(await db("notification").where({ dossier: dossier.id, personne: user }).first()).toEqual(
    before,
  );
  await changeAssignments(db, (routingTrx) =>
    routingTrx("groupe_dossier_override")
      .where({ dossier: dossier.id })
      .update({ mode: "exclude" }),
  );
  expect(await access(dossier.id, user)).toBe("lecture");
  expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").insert({
      dossier: dossier.id,
      user_id: user,
      access_level: "read",
    }),
  );
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("user_groupe").where({ user_id: user }).delete(),
  );
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
  const [email] = await db("email_notification_outbox")
    .insert({
      personne: user,
      dossier: dossier.id,
      kind: "novelty",
      batch_key: "follow-cleanup",
      due_at: new Date(),
    })
    .returning("id");
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").where({ user_id: user }).delete(),
  );
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
  expect(await db("email_notification_outbox").where({ id: email.id }).first()).toMatchObject({
    status: "cancelled",
    cancellation_reason: "lost_access",
  });
  expect(
    await db("email_notification_history").where({ notification_id: email.id, event: "cancelled" }),
  ).toHaveLength(1);
});

test("recalculation is silent, but ordinary arrivals notify read-only group members", async () => {
  const { db } = fixture;
  const user = await reader();
  const group = await createGroupeInstructeurs(db);
  await db("user_groupe").insert({ user_id: user, groupe_instructeurs: group.id });
  const existing = await createDossier(db, { primary_department: "75" });
  const [rule] = await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_regle")
        .insert({ groupe_instructeurs: group.id, departments: ["75"], access_level: "read" })
        .returning("id"),
    { silent: true },
  );
  expect(await access(existing.id, user)).toBe("lecture_complete");
  expect(await db("email_notification_outbox")).toHaveLength(0);
  const arrived = await createDossier(db, { primary_department: "75" });
  expect(await db("email_notification_outbox")).toMatchObject([
    { personne: user, dossier: arrived.id, kind: "arrival" },
  ]);
  const before = await db("email_notification_groupe_arrival").orderBy("dossier");
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_regle").where({ id: rule.id }).update({ access_level: "instruct" }),
    { silent: true },
  );
  expect(await db("email_notification_groupe_arrival").orderBy("dossier")).toEqual(before);
  expect(await db("email_notification_outbox")).toHaveLength(1);
});
