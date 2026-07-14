import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { getDossierComplet } from "@pitchou/server/database/dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";

const ODS_MEDIA_TYPE = "application/vnd.oasis.opendocument.spreadsheet";

test("un dossier avec un fichier espèces impactées stocké sur S3 expose espècesImpactées", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);

  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, {
    nom: "especes-impactées.ods",
    mediaType: ODS_MEDIA_TYPE,
    bytes: Buffer.from("PK ods bytes"),
  });

  await db("dossier").update({ espèces_impactées: fichier.id }).where({ id: dossier.id });

  const result = await getDossierComplet(dossier.id as DossierId, cap as CapDossier["cap"], db);

  expect(result).toBeDefined();
  // The file is linked to the dossier in the database → it must show up in the UI.
  expect(result!.espècesImpactées).toBeDefined();
  expect(result!.espècesImpactées!.nom).toBe("especes-impactées.ods");
  expect(result!.espècesImpactées!.media_type).toBe(ODS_MEDIA_TYPE);
  expect(result!.espècesImpactées!.url).toBe(`/especes-impactees/${fichier.id}`);
});
