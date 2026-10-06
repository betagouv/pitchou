import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { putPendingUpload } from "../helpers/fileStorage.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import {
  deleteEspecesImpacteesFromAdmin,
  setEspecesImpacteesFromAdmin,
} from "@pitchou/server/database/dossier_admin_files.ts";

test("the fichier especes impactees can be replaced and removed from a native dossier", async () => {
  await getTestS3();
  await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier espèces impactées",
      depot_date: new Date("2026-07-13"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations("Martin", "Camille"),
    },
    "admin-files@pitchou.test",
    db,
  );

  const odsType = "application/vnd.oasis.opendocument.spreadsheet";
  const first = await setEspecesImpacteesFromAdmin(
    id,
    { ...(await putPendingUpload("first", "first.ods", odsType)), media_type: odsType },
    db,
  );
  const second = await setEspecesImpacteesFromAdmin(
    id,
    { ...(await putPendingUpload("second", "second.ods", odsType)), media_type: odsType },
    db,
  );
  expect(await db("file").where({ id: second.id }).first()).toMatchObject({
    media_type: odsType,
    size: "6",
  });

  expect(await db("file").where({ id: first.id }).first()).toBeUndefined();
  expect(await deleteEspecesImpacteesFromAdmin(id, db)).toBe(true);
  expect(await db("file").where({ id: second.id }).first()).toBeUndefined();
  expect(await db("dossier").select("especes_impactees").where({ id }).first()).toMatchObject({
    especes_impactees: null,
  });
  expect(await deleteEspecesImpacteesFromAdmin(id, db)).toBe(false);
});
