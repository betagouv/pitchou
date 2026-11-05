import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { getDossiersSummariesForUser } from "@pitchou/server/database/dossier/summary.ts";
import { dossierAccessQuery } from "@pitchou/server/database/dossier/access.ts";
import { dossierAccessSql } from "@pitchou/server/dossierRouting/access.ts";
import { changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
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

async function projectFixture() {
  const { db } = fixture;
  const dossiers = await Promise.all(Array.from({ length: 3 }, () => createDossier(db)));
  const [project] = await db("dossier_projet").insert({ name: "Shared project" }).returning("id");
  await db("dossier_demande").insert(
    dossiers.slice(0, 2).map((d, index) => ({
      dossier: d.id,
      projet: project.id,
      label: `Demande ${index + 1}`,
    })),
  );
  const [user] = await db("auth_user").insert({ email: "summary@example.org" }).returning("id");
  await db("auth_permission").insert(
    ["dossier:read", "dossier:instruct"].map((permission) => ({ user_id: user.id, permission })),
  );
  return { dossiers, project, user: user.id as UserId };
}

async function assertAccessMatchesPolicy(user: UserId) {
  const { db } = fixture;
  const actual = await dossierAccessQuery(user, db).orderBy("dossier.id");
  const { rows } = await db.raw(
    `SELECT id AS dossier, ${dossierAccessSql("dossier.id", "input.user_id")} AS access FROM dossier CROSS JOIN (SELECT ?::integer AS user_id) input ORDER BY id`,
    [user],
  );
  expect(actual).toEqual(rows.filter((row: { access: string | null }) => row.access !== null));
}

test("summary aggregates retain independent demandes, species, latest comment and project counts", async () => {
  const { db } = fixture;
  const {
    dossiers: [first, sibling, standalone],
    project,
    user,
  } = await projectFixture();
  await changeDossierAccess(db, (trx) =>
    trx("dossier_user_access").insert({
      dossier: first.id,
      user_id: user,
      access_level: "instruct",
    }),
  );
  const [file] = await db("file").insert({ name: "species.ods", size: "1" }).returning("id");
  await db("impact_espece").insert(
    ["2437", "2437", "1234"].map((cd_ref) => ({
      dossier: first.id,
      source_file: file.id,
      cd_ref,
      classification: "oiseau",
    })),
  );
  await db("commentaire").insert([
    {
      dossier: first.id,
      personne: user,
      content: "Old comment",
      created_at: new Date("2025-01-01"),
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      dossier: first.id,
      personne: user,
      content: "Tie first",
      created_at: new Date("2025-02-01"),
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      dossier: first.id,
      personne: user,
      content: "Tie last",
      created_at: new Date("2025-02-01"),
    },
  ]);
  const summaries = await getDossiersSummariesForUser(user, db);
  expect(summaries).toHaveLength(2);
  const byId = new Map(summaries.map((d) => [Number(d.id), d]));
  expect(byId.get(first.id)).toMatchObject({
    access: "complet",
    latestCommentaire: "Tie last",
    especesImpacteesCD_REF: ["1234", "2437"],
    especesImpacteesRenseignees: true,
    projet: { id: project.id, count: 2, demandeLabel: "Demande 1" },
  });
  expect(byId.get(sibling.id)).toMatchObject({
    access: "complet",
    latestCommentaire: null,
    especesImpacteesCD_REF: [],
    especesImpacteesRenseignees: false,
    projet: { id: project.id, count: 2, demandeLabel: "Demande 2" },
  });
  await changeDossierAccess(db, (trx) =>
    trx("dossier_user_access").insert({
      dossier: standalone.id,
      user_id: user,
      access_level: "read",
    }),
  );
  expect(
    (await getDossiersSummariesForUser(user, db)).find((d) => Number(d.id) === standalone.id)
      ?.projet,
  ).toBeNull();
});

test("batch access agrees with policy for mixed duplicate grants, inactive groups and exclusions", async () => {
  const { db } = fixture;
  const {
    dossiers: [first, sibling, standalone],
    user,
  } = await projectFixture();
  const group = await createGroupeInstructeurs(db);
  await db("user_groupe").insert({ user_id: user, groupe_instructeurs: group.id });
  await changeDossierAccess(db, async (trx) => {
    await trx("edge_groupe_instructeurs__dossier").insert([
      { dossier: first.id, groupe_instructeurs: group.id, access_level: "read" },
      { dossier: sibling.id, groupe_instructeurs: group.id, access_level: "instruct" },
    ]);
    await trx("dossier_user_access").insert([
      { dossier: first.id, user_id: user, access_level: "read" },
      { dossier: sibling.id, user_id: user, access_level: "read" },
      { dossier: standalone.id, user_id: user, access_level: "read" },
    ]);
  });
  await assertAccessMatchesPolicy(user);
  await db("groupe_instructeurs").where({ id: group.id }).update({ active: false });
  await assertAccessMatchesPolicy(user);
  await db("auth_permission_exclusion").insert({ user_id: user, permission: "dossier:instruct" });
  await assertAccessMatchesPolicy(user);
  await db("dossier_user_access").where({ dossier: standalone.id }).delete();
  await assertAccessMatchesPolicy(user);
  await db("auth_permission_exclusion").insert({ user_id: user, permission: "dossier:read" });
  await assertAccessMatchesPolicy(user);
  expect(await getDossiersSummariesForUser(user, db)).toEqual([]);
});
