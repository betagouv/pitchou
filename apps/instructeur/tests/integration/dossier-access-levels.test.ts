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

test("direct grants work without groups and account permissions always cap the strongest grant", async () => {
  const { db } = fixture;
  const user = await reader();
  const dossier = await createDossier(db);
  const other = await createDossier(db);
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").insert({
      dossier: dossier.id,
      user_id: user,
      access_level: "read",
    }),
  );
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  expect(await access(other.id, user)).toBeUndefined();
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").where({ user_id: user }).update({ access_level: "instruct" }),
  );
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await db("auth_permission").insert({ user_id: user, permission: "dossier:instruct" });
  expect(await access(dossier.id, user)).toBe("complet");
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("auth_permission_exclusion").insert({
      user_id: user,
      permission: "dossier:instruct",
    }),
  );
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("auth_permission_exclusion").insert({ user_id: user, permission: "dossier:read" }),
  );
  expect(await access(dossier.id, user)).toBeUndefined();
  await changeDossierAccess(db, (routingTrx) => routingTrx("auth_permission_exclusion").delete());
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("auth_user").where({ id: user }).update({ active: false }),
  );
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
  await changeAssignments(db, (routingTrx) => routingTrx("group_routing_rule").insert(rule), {
    silent: true,
  });
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await changeAssignments(
    db,
    (routingTrx) => routingTrx("group_routing_rule").insert({ ...rule, access_level: "instruct" }),
    { silent: true },
  );
  expect(await access(dossier.id, user)).toBe("complet");
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier_group_override").insert({
      dossier: dossier.id,
      groupe_instructeurs: first.id,
      mode: "include",
      access_level: "read",
    }),
  );
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_departement").insert({ groupe_instructeurs: second.id, department: "75" }),
    { silent: true },
  );
  expect(await access(dossier.id, user)).toBe("complet");
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier_group_override").insert({
      dossier: dossier.id,
      groupe_instructeurs: second.id,
      mode: "exclude",
    }),
  );
  expect(await access(dossier.id, user)).toBe("lecture_complete");
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").insert({ dossier: dossier.id, user_id: user }),
  );
  expect(await access(dossier.id, user)).toBe("complet");
  await changeDossierAccess(db, (routingTrx) => routingTrx("dossier_user_access").delete());
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier_group_override").where({ groupe_instructeurs: first.id }).delete(),
  );
  expect(await access(dossier.id, user)).toBe("complet");
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_instructeurs").where({ id: first.id }).update({ active: false }),
    { silent: true },
  );
  expect(await access(dossier.id, user)).toBe("lecture");
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_instructeurs").where({ id: second.id }).update({ active: false }),
    { silent: true },
  );
  expect(await access(dossier.id, user)).toBeUndefined();
});
