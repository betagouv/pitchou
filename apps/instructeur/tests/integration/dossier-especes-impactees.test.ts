import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { seedEspeceProtegeeReference } from "../factories/especeProtegeeReference.ts";
import { getDossierFull } from "@pitchou/server/database/dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";

const ODS_MEDIA_TYPE = "application/vnd.oasis.opendocument.spreadsheet";

// The référentiel is not seeded here: the migrations fill impact_type / impact_methode /
// impact_moyen_de_poursuite, and `truncateAll` spares them. So P-2-1 below is the real thing.

test("un dossier avec un fichier espèces impactées stocké sur S3 expose le fichier source", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);

  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, {
    name: "especes-impactées.ods",
    mediaType: ODS_MEDIA_TYPE,
    bytes: Buffer.from("PK ods bytes"),
  });

  await db("dossier").update({ especes_impactees: fichier.id }).where({ id: dossier.id });

  const result = await getDossierFull(dossier.id as DossierId, cap as CapDossier["cap"], db);

  expect(result).toBeDefined();
  // The file is linked to the dossier in the database → the instructrice can still download it.
  const { sourceFile } = result!.especesImpactees;
  expect(sourceFile).toBeDefined();
  expect(sourceFile!.name).toBe("especes-impactées.ods");
  expect(sourceFile!.media_type).toBe(ODS_MEDIA_TYPE);
  expect(sourceFile!.url).toBe(`/especes-impactees/${fichier.id}?cap=${cap}`);
});

test("les impacts sont servis avec leurs libellés résolus", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);

  await seedEspeceProtegeeReference(
    [
      {
        cd_ref: "2437",
        classification: "oiseau",
        noms_scientifiques: ["Morus bassanus"],
        noms_vernaculaires: ["Fou de Bassan"],
        cd_type_statuts: ["PN"],
      },
    ],
    db,
  );

  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, {
    name: "especes-impactées.ods",
    mediaType: ODS_MEDIA_TYPE,
    bytes: Buffer.from("PK ods bytes"),
  });
  await db("dossier").update({ especes_impactees: fichier.id }).where({ id: dossier.id });

  await db("impact_espece").insert({
    dossier: dossier.id,
    source_file: fichier.id,
    cd_ref: "2437",
    classification: "oiseau",
    impact_type: "P-2-1",
    impact_methode: "0",
    nombre_individus: "11-100",
  });

  const result = await getDossierFull(dossier.id as DossierId, cap as CapDossier["cap"], db);

  const { impacts } = result!.especesImpactees;
  expect(impacts).toHaveLength(1);
  // Every code the row holds comes back as the libellé the interface displays: this is what the
  // Projet tab renders, without asking for a référentiel of its own.
  expect(impacts[0].espece).toMatchObject({
    CD_REF: "2437",
    nomVernaculaire: "Fou de Bassan",
    nomScientifique: "Morus bassanus",
    especeCNPN: false,
    especeMinisterielle: false,
  });
  expect(impacts[0].typeImpact).toMatchObject({ identifiantPitchou: "P-2-1" });
  expect(impacts[0].typeImpact!.libelle).not.toBe("");
  expect(impacts[0].typeImpact!.criteriaAllowed).toContain("Nombre d'individus");
  expect(impacts[0].methode).not.toBeNull();
  expect(impacts[0].nombreIndividus).toBe("11-100");
});

test("un dossier sans impact expose une liste vide", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);

  const result = await getDossierFull(dossier.id as DossierId, cap as CapDossier["cap"], db);

  expect(result!.especesImpactees).toEqual({ sourceFile: undefined, impacts: [] });
});
