import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import type { UserId } from "@pitchou/types/permissions.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
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
  const { rows } = await fixture.db.raw("SELECT pitchou_dossier_access(?, ?) AS access", [
    dossier,
    user,
  ]);
  expect(value).toBe(rows[0].access ?? undefined);
  return value;
};
async function reader() {
  const { db } = fixture;
  const [user] = await db("auth_user").insert({ email: "read@example.org" }).returning("id");
  await db("auth_permission").insert({ user_id: user.id, permission: "dossier:read" });
  return user.id as UserId;
}

test("direct grants work without groups and account permissions always cap the strongest grant", async () => {
  const { db } = fixture;
  const user = await reader();
  const dossier = await createDossier(db);
  const other = await createDossier(db);
  await db("dossier_user_access").insert({
    dossier: dossier.id,
    user_id: user,
    access_level: "read",
  });
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  expect(await access(other.id, user)).toBeUndefined();
  await db("dossier_user_access").where({ user_id: user }).update({ access_level: "instruct" });
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await db("auth_permission").insert({ user_id: user, permission: "dossier:instruct" });
  expect(await access(dossier.id, user)).toBe("complet");
  await db("auth_permission_exclusion").insert({ user_id: user, permission: "dossier:instruct" });
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await db("auth_permission_exclusion").insert({ user_id: user, permission: "dossier:read" });
  expect(await access(dossier.id, user)).toBeUndefined();
  await db("auth_permission_exclusion").delete();
  await db("auth_user").where({ id: user }).update({ active: false });
  expect(await access(dossier.id, user)).toBeUndefined();
});

test("rules select the strongest level, overrides take precedence, and other grants remain additive", async () => {
  const { db } = fixture;
  const user = await reader();
  await db("auth_permission").insert({ user_id: user, permission: "dossier:instruct" });
  const first = await createGroupeInstructeurs(db);
  const second = await createGroupeInstructeurs(db, { name: "Second" });
  await db("user_groupe").insert(
    [first, second].map((g) => ({ user_id: user, groupe_instructeurs: g.id })),
  );
  const dossier = await createDossier(db, { primary_department: "75" });
  const rule = { groupe_instructeurs: first.id, departments: ["75"], access_level: "read" };
  await db("groupe_regle").insert(rule);
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await db("groupe_regle").insert({ ...rule, access_level: "instruct" });
  expect(await access(dossier.id, user)).toBe("complet");
  await db("groupe_dossier_override").insert({
    dossier: dossier.id,
    groupe_instructeurs: first.id,
    mode: "include",
    access_level: "read",
  });
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await db("groupe_departement").insert({ groupe_instructeurs: second.id, department: "75" });
  expect(await access(dossier.id, user)).toBe("complet");
  await db("groupe_dossier_override").insert({
    dossier: dossier.id,
    groupe_instructeurs: second.id,
    mode: "exclude",
  });
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await db("dossier_user_access").insert({ dossier: dossier.id, user_id: user });
  expect(await access(dossier.id, user)).toBe("complet");
  await db("dossier_user_access").delete();
  await db("groupe_dossier_override").where({ groupe_instructeurs: first.id }).delete();
  expect(await access(dossier.id, user)).toBe("complet");
  await db("groupe_instructeurs").where({ id: first.id }).update({ active: false });
  expect(await access(dossier.id, user)).toBe("lecture");
  await db("groupe_instructeurs").where({ id: second.id }).update({ active: false });
  expect(await access(dossier.id, user)).toBeUndefined();
});

test("downgrades preserve follows and notification revisions until all reading access disappears", async () => {
  const { db } = fixture;
  const user = await reader();
  const group = await createGroupeInstructeurs(db);
  await db("user_groupe").insert({ user_id: user, groupe_instructeurs: group.id });
  const dossier = await createDossier(db, { primary_department: "75" });
  await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "75" });
  await db("edge_personne_follows_dossier").insert({ dossier: dossier.id, personne: user });
  const before = await db("notification").where({ dossier: dossier.id, personne: user }).first();
  await db("groupe_dossier_override").insert({
    dossier: dossier.id,
    groupe_instructeurs: group.id,
    mode: "include",
    access_level: "read",
  });
  expect(await db("notification").where({ dossier: dossier.id, personne: user }).first()).toEqual(
    before,
  );
  await db("groupe_dossier_override").where({ dossier: dossier.id }).update({ mode: "exclude" });
  expect(await access(dossier.id, user)).toBe("lecture");
  expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
  await db("dossier_user_access").insert({
    dossier: dossier.id,
    user_id: user,
    access_level: "read",
  });
  await db("user_groupe").where({ user_id: user }).delete();
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
  await db("dossier_user_access").where({ user_id: user }).delete();
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
  const [rule] = await db("groupe_regle")
    .insert({ groupe_instructeurs: group.id, departments: ["75"], access_level: "read" })
    .returning("id");
  expect(await access(existing.id, user)).toBe("lecture_complete");
  expect(await db("email_notification_outbox")).toHaveLength(0);
  const arrived = await createDossier(db, { primary_department: "75" });
  expect(await db("email_notification_outbox")).toMatchObject([
    { personne: user, dossier: arrived.id, kind: "arrival" },
  ]);
  const before = await db("email_notification_groupe_arrival").orderBy("dossier");
  await db("groupe_regle").where({ id: rule.id }).update({ access_level: "instruct" });
  expect(await db("email_notification_groupe_arrival").orderBy("dossier")).toEqual(before);
  expect(await db("email_notification_outbox")).toHaveLength(1);
});
