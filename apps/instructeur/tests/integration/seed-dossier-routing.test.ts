import { expect, test } from "vitest";
import { seed as seedUsers } from "../../../../libs/database/seeds/dev/06_users.ts";
import { seedDossierActors } from "../../../../libs/database/seeds/dev/dossier/actors.ts";
import { seedDossierRows } from "../../../../libs/database/seeds/dev/dossier/rows.ts";
import { SEED_DOSSIERS } from "../../../../libs/database/seeds/fixtures/dossiers.ts";
import { departements } from "@pitchou/common/departements.ts";
import { db } from "../setup/db.ts";

test("fresh and repeated seeds route realistic dossiers and keep one deliberate unmatched example", async () => {
  await seedUsers(db);
  const admin = await db("groupe_instructeurs").where({ name: "Administrateur" }).first();
  expect(
    await db("groupe_departement").where({ groupe_instructeurs: admin.id }).pluck("department"),
  ).toHaveLength(departements.length);
  const seedRows = () =>
    db.transaction(async (trx) => {
      const actors = await seedDossierActors(trx, process.env.SEED_EMAIL ?? "dev@localhost.local");
      return seedDossierRows(trx, actors);
    });
  const first = await seedRows();
  const owners = (id: number) =>
    db("edge_groupe_instructeurs__dossier as e")
      .join("groupe_instructeurs as g", "g.id", "e.groupe_instructeurs")
      .where("e.dossier", id)
      .orderBy("g.name")
      .pluck("g.name");
  for (const fixture of SEED_DOSSIERS) {
    const id = first.dossierIdMap[fixture.demarche_numerique_number!];
    const row = await db("dossier").where({ id }).first();
    expect(row.primary_department).toBe(fixture.primary_department);
    if (fixture.primary_department) {
      expect(row.departments).toContain(fixture.primary_department);
      expect(await owners(id)).toContain("Administrateur");
      expect((await owners(id)).length).toBeGreaterThan(1);
    } else {
      expect(await owners(id)).toEqual([]);
      expect([...first.agentVisibleDossiers.values()].flat()).not.toContain(id);
    }
  }
  expect(SEED_DOSSIERS.filter((dossier) => !dossier.primary_department)).toHaveLength(1);
  expect(await owners(first.dossierIdMap["99000011"])).toEqual([
    "Administrateur",
    "DREAL BRETAGNE",
  ]);
  expect(
    (await db("dossier").where({ id: first.dossierIdMap["99000011"] }).first()).departments,
  ).toEqual(["35", "22"]);
  // A rerun repairs old fixtures but preserves group coverage edited in the admin app.
  await db("dossier")
    .where({ id: first.dossierIdMap["99000001"] })
    .update({ primary_department: null });
  const group = await db("groupe_instructeurs").where({ name: "DREAL BRETAGNE" }).first();
  await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "50" });
  await seedUsers(db);
  const second = await seedRows();
  expect(second.dossierIdMap).toEqual(first.dossierIdMap);
  expect(await owners(first.dossierIdMap["99000001"])).toEqual([
    "Administrateur",
    "DREAL BRETAGNE",
  ]);
  expect(
    await db("groupe_departement").where({ groupe_instructeurs: group.id }).pluck("department"),
  ).toContain("50");
  expect((await db("dossier").count("* as count").first())?.count).toBe(
    String(SEED_DOSSIERS.length),
  );
});
