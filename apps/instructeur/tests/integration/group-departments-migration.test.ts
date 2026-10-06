import { expect, test } from "vitest";
import { departements } from "@pitchou/common/departements.ts";
import { up } from "../../../../libs/database/migrations/20261005103000_map-imported-group-departments.ts";
import { db } from "../setup/db.ts";

async function group(name: string, overrides: Record<string, unknown> = {}) {
  const [row] = await db("groupe_instructeurs")
    .insert({ name, demarche_number: 88444, ...overrides })
    .returning("*");
  return row;
}

async function coverage(id: string) {
  return db("groupe_departement")
    .where({ groupe_instructeurs: id })
    .orderBy("department")
    .pluck("department");
}

test("backfills the supplied DN routing rules, administrator coverage and inactive services", async () => {
  const rules: Record<string, string> = {
    "DDT02 -  AISNE": "02",
    DDT02: "02",
    DDT37: "37",
    "DDT 41": "41",
    "DDT 45 - Loiret": "45",
    "DDT59 - NORD": "59",
    "DDTM 62": "62",
    "DDTM 80": "80",
    "DEAL Guadeloupe": "971",
    "DEAL Martinique": "972",
    "DEALM Mayotte": "976",
    "DEAL Réunion": "974",
    "Dév Pitchou": "99",
    "DGTM Guyane": "973",
    "DREAL Auvergne-Rhône-Alpes": "01 03 07 15 26 38 42 43 63 69 73 74",
    "DREAL BFC": "21 25 39 58 70 71 89 90",
    "DREAL BRETAGNE": "22 29 35 56",
    "DREAL Centre Val de Loire": "18 28 36 37 41 45",
    "DREAL de Corse et DMLC": "2A 2B",
    "DREAL Grand Est": "08 10 51 52 54 55 57 67 68 88",
    "DREAL Normandie": "14 27 50 61 76",
    "DREAL Nouvelle-Aquitaine": "16 17 19 23 24 33 40 47 64 79 86 87",
    "DREAL Occitanie": "09 11 12 30 31 32 34 46 48 65 66 81 82",
    "DREAL PACA": "04 05 06 13 83 84",
    "DREAL Pays de la loire": "44 49 53 72 85",
    "DRIEAT IDF": "75 77 78 91 92 93 94 95",
    "DRIAT IDF": "75 77 78 91 92 93 94 95",
  };
  const groups = [];
  for (const name of Object.keys(rules)) groups.push(await group(name));
  const admin = await group("Administrateur");
  await db.transaction(up);
  for (const row of groups) {
    expect(await coverage(row.id), row.name).toEqual(rules[row.name].split(" "));
    const migrated = await db("groupe_instructeurs").where({ id: row.id }).first();
    expect(migrated.coverage_needs_review, row.name).toBe(false);
    expect(migrated.active, row.name).toBe(
      !["DDT37", "DDT 41", "DDT 45 - Loiret"].includes(row.name),
    );
  }
  expect(await coverage(admin.id)).toEqual(departements.map(({ code }) => code).sort());
  const before = await db("groupe_departement").orderBy(["groupe_instructeurs", "department"]);
  await db.transaction(up);
  expect(await db("groupe_departement").orderBy(["groupe_instructeurs", "department"])).toEqual(
    before,
  );
});

test("preserves reviewed and local groups, and flags unknown or conflicting coverage", async () => {
  const reviewed = await group("DDT37", { coverage_needs_review: false });
  const local = await group("Administrateur", { demarche_number: null });
  const unknown = await group("Multi-régions");
  const testGroup = await group("Groupe de test");
  const conflict = await group("DEAL Réunion");
  await db("groupe_departement").insert([
    { groupe_instructeurs: reviewed.id, department: "75" },
    { groupe_instructeurs: conflict.id, department: "973" },
  ]);
  await db.transaction(up);
  expect(await coverage(reviewed.id)).toEqual(["75"]);
  expect((await db("groupe_instructeurs").where({ id: reviewed.id }).first()).active).toBe(true);
  for (const row of [local, unknown, testGroup]) expect(await coverage(row.id)).toEqual([]);
  expect(await coverage(conflict.id)).toEqual(["973", "974"]);
  for (const row of [local, unknown, testGroup, conflict])
    expect(
      (await db("groupe_instructeurs").where({ id: row.id }).first()).coverage_needs_review,
    ).toBe(true);
});

test("routes existing dossiers to every covering active group and retains primary department routing", async () => {
  const admin = await group("Administrateur");
  const regional = await group("DREAL Centre Val de Loire");
  const inactive = await group("DDT37");
  const dev = await group("Dév Pitchou");
  const [dossier, missing] = await db("dossier")
    .insert([
      { depot_date: new Date(), source: "demarche_numerique", primary_department: "37" },
      { depot_date: new Date(), source: "demarche_numerique", primary_department: null },
    ])
    .returning("id");
  const owners = (id: number) =>
    db("edge_groupe_instructeurs__dossier").where({ dossier: id }).pluck("groupe_instructeurs");
  await db.transaction(up);
  expect((await owners(dossier.id)).sort()).toEqual([admin.id, regional.id].sort());
  expect(await owners(dossier.id)).not.toContain(inactive.id);
  expect(await owners(missing.id)).toEqual([]);
  await db("dossier").where({ id: dossier.id }).update({ primary_department: "99" });
  expect((await owners(dossier.id)).sort()).toEqual([admin.id, dev.id].sort());
});
