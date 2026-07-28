import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import {
  deleteEspecesImpacteesFromAdmin,
  setEspecesImpacteesFromAdmin,
} from "@pitchou/server/database/dossier_admin_files.ts";

import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

test("the fichier especes impactees can be replaced and removed from a native dossier", async () => {
  await getTestS3();
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier espèces impactées",
      depot_date: new Date("2026-07-13"),
      phase: "Instruction",
      groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
      demandeur_personne_physique: { last_name: "Martin", first_names: "Camille" },
    },
    "admin-files@pitchou.test",
    db,
  );

  const first = await setEspecesImpacteesFromAdmin(
    id,
    {
      name: "first.ods",
      media_type: "application/vnd.oasis.opendocument.spreadsheet",
      content: Buffer.from("first"),
    },
    db,
  );
  const second = await setEspecesImpacteesFromAdmin(
    id,
    {
      name: "second.ods",
      media_type: "application/vnd.oasis.opendocument.spreadsheet",
      content: Buffer.from("second"),
    },
    db,
  );

  expect(await db("file").where({ id: first.id }).first()).toBeUndefined();
  expect(await deleteEspecesImpacteesFromAdmin(id, db)).toBe(true);
  expect(await db("file").where({ id: second.id }).first()).toBeUndefined();
  expect(await db("dossier").select("especes_impactees").where({ id }).first()).toMatchObject({
    especes_impactees: null,
  });
  expect(await deleteEspecesImpacteesFromAdmin(id, db)).toBe(false);
});
