import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import { dumpDossiers } from "@pitchou/server/database/dossier.ts";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import type { DossierForInsert } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

test("new DN dossiers default to Instructeur without replacing imported assignments", async () => {
  const inserts: DossierForInsert[] = [undefined, null, "Pétitionnaire"].map((entity, index) => ({
    dossier: {
      name: `New dossier ${index}`,
      source: "demarche_numerique",
      demarche_numerique_number: String(910100 + index),
      depot_date: new Date(),
      ...(entity === undefined ? {} : { next_action_expected_from: entity }),
    },
    evenement_phase_dossier: [],
    decision_administrative: [],
    avis_expert: [],
    followers: undefined,
  }));
  await dumpDossiers(inserts, [], db);
  expect(
    await db("dossier").select("next_action_expected_from").orderBy("demarche_numerique_number"),
  ).toEqual([
    { next_action_expected_from: "Instructeur" },
    { next_action_expected_from: "Instructeur" },
    { next_action_expected_from: "Pétitionnaire" },
  ]);
});

test.each([null, "Pétitionnaire"])(
  "later DN synchronization preserves the existing entity %s",
  async (entity) => {
    const existing = await createDossier(db, {
      demarche_numerique_number: "910200",
      next_action_expected_from: entity,
    });
    await dumpDossiers(
      [],
      [
        {
          dossier: { demarche_numerique_number: "910200", name: "Updated project" },
          evenement_phase_dossier: [],
          decision_administrative: [],
        },
      ],
      db,
    );
    expect(await db("dossier").where({ id: existing.id }).first()).toMatchObject({
      name: "Updated project",
      next_action_expected_from: entity,
    });
  },
);

test.each([undefined, null, "CNPN/CSRPN"])(
  "admin creation defaults only empty entities, received %s",
  async (entity) => {
    const instructeur = await createInstructeurWithCapToGroup(db);
    const { id } = await createDossierFromAdmin(
      {
        name: "New native dossier",
        depot_date: new Date(),
        phase: "Accompagnement amont",
        relations: physicalAdminDossierRelations(instructeur.groupeId, "Martin", "Camille"),
        ...(entity === undefined ? {} : { columns: { next_action_expected_from: entity } }),
      },
      "admin@pitchou.test",
      db,
    );
    expect(await db("dossier").where({ id }).first()).toMatchObject({
      next_action_expected_from: entity ?? "Instructeur",
    });
  },
);
