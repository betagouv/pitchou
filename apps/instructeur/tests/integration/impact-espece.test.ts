import { expect, test } from "vitest";
import { createOdsFile } from "@odfjs/odfjs";

import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { seedEspeceProtegeeReference } from "../factories/especeProtegeeReference.ts";
import { createDossier } from "../factories/dossier.ts";
import { createFichierS3 } from "../factories/fichier.ts";

import { dumpImpactEspeceFromFichier } from "@pitchou/server/database/impact_espece/dumpImpactEspeceFromFichier.ts";

const ODS_MEDIA_TYPE = "application/vnd.oasis.opendocument.spreadsheet";

// The référentiel is not seeded here: the migrations fill impact_type / impact_methode /
// impact_moyen_de_poursuite, and `truncateAll` spares them. So P-2-1 below is the real thing.

type Cellule = string | number;

async function odsEspecesImpactees(headers: string[], rows: Cellule[][]): Promise<Buffer> {
  const sheets = new Map([
    [
      "oiseau",
      [headers, ...rows].map((row) =>
        row.map((value) =>
          typeof value === "number" ? { type: "float", value } : { type: "string", value },
        ),
      ),
    ],
  ]);
  const arrayBuffer = await createOdsFile(sheets as Parameters<typeof createOdsFile>[0]);
  return Buffer.from(arrayBuffer);
}

async function seedFouDeBassan() {
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
}

async function dossierAvecFichier(bytes: Buffer, mediaType = ODS_MEDIA_TYPE) {
  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, {
    name: "especes-impactees.ods",
    mediaType,
    bytes,
  });
  const dossier = await createDossier(db, {
    name: "Parc éolien du Test",
    especes_impactees: fichier.id,
  });

  return { dossier, fichier };
}

test("le fichier espèces impactées est dumpé dans impact_espece", async () => {
  await seedFouDeBassan();
  const { dossier, fichier } = await dossierAvecFichier(
    await odsEspecesImpactees(
      ["CD_REF", "nombre individus", "identifiant pitchou activité", "code méthode"],
      [["2437", "11-100", "P-2-1", "0"]],
    ),
  );

  const anomalies = await dumpImpactEspeceFromFichier(dossier.id, fichier.id, db);

  expect(anomalies).toEqual([]);
  const rows = await db("impact_espece").where({ dossier: dossier.id });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    cd_ref: "2437",
    classification: "oiseau",
    impact_type: "P-2-1",
    impact_methode: "0",
    nombre_individus: "11-100",
  });
  // Provenance: the row says which file it came from, so it can always be checked against the
  // document the pétitionnaire actually sent.
  expect(rows[0].source_file).toBe(fichier.id);
});

test("réimporter le même fichier ne fait rien", async () => {
  await seedFouDeBassan();
  const { dossier, fichier } = await dossierAvecFichier(
    await odsEspecesImpactees(
      ["CD_REF", "nombre individus", "identifiant pitchou activité"],
      [["2437", "11-100", "P-2-1"]],
    ),
  );

  await dumpImpactEspeceFromFichier(dossier.id, fichier.id, db);
  const [premier] = await db("impact_espece").where({ dossier: dossier.id });

  // The synchronization re-attaches an unchanged file on every pass; the second import must be a
  // no-op rather than deleting and re-inserting the same lines.
  await dumpImpactEspeceFromFichier(dossier.id, fichier.id, db);

  const rows = await db("impact_espece").where({ dossier: dossier.id });
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe(premier.id);
});

test("un nouveau fichier remplace les lignes du précédent", async () => {
  await seedFouDeBassan();
  const { dossier, fichier } = await dossierAvecFichier(
    await odsEspecesImpactees(
      ["CD_REF", "nombre individus", "identifiant pitchou activité"],
      [["2437", "11-100", "P-2-1"]],
    ),
  );
  await dumpImpactEspeceFromFichier(dossier.id, fichier.id, db);

  const s3 = await getTestS3();
  const nouveauFichier = await createFichierS3(db, s3, {
    name: "especes-impactees-v2.ods",
    mediaType: ODS_MEDIA_TYPE,
    bytes: await odsEspecesImpactees(
      ["CD_REF", "nombre individus", "identifiant pitchou activité"],
      [["2437", "1-10", "P-2-1"]],
    ),
  });

  await dumpImpactEspeceFromFichier(dossier.id, nouveauFichier.id, db);

  const rows = await db("impact_espece").where({ dossier: dossier.id });
  expect(rows).toHaveLength(1);
  expect(rows[0].nombre_individus).toBe("1-10");
  expect(rows[0].source_file).toBe(nouveauFichier.id);
});

test("une ligne illisible est signalée, les autres sont importées", async () => {
  await seedFouDeBassan();
  const { dossier, fichier } = await dossierAvecFichier(
    await odsEspecesImpactees(
      ["CD_REF", "nombre individus", "identifiant pitchou activité"],
      [
        ["404404", "1-10", "P-2-1"],
        ["2437", "11-100", "P-2-1"],
      ],
    ),
  );

  const anomalies = await dumpImpactEspeceFromFichier(dossier.id, fichier.id, db);

  expect(anomalies).toHaveLength(1);
  expect(anomalies[0].message).toContain("404404");
  const rows = await db("impact_espece").where({ dossier: dossier.id });
  expect(rows).toHaveLength(1);
  expect(rows[0].cd_ref).toBe("2437");
});

test("un fichier qui n'est pas un tableur est signalé sans faire échouer l'import", async () => {
  await seedFouDeBassan();
  const { dossier, fichier } = await dossierAvecFichier(
    Buffer.from("ceci n'est pas un tableur"),
    "application/pdf",
  );

  // Never throws: this runs inside the synchronization transaction, where a throw would roll back
  // every other dossier of the run.
  const anomalies = await dumpImpactEspeceFromFichier(dossier.id, fichier.id, db);

  expect(anomalies).toHaveLength(1);
  expect(await db("impact_espece").where({ dossier: dossier.id })).toHaveLength(0);
});
