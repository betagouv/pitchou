import { expect, test } from "vitest";
import { HeadObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { createDossier } from "../factories/dossier.ts";
import { supprimerFichiersSansAutresReferences } from "@pitchou/server/database/fichier.ts";

async function s3HasKey(key: string): Promise<boolean> {
  const { client, bucket } = await getTestS3();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    if (e instanceof S3ServiceException && (e.name === "NotFound" || e.name === "NoSuchKey")) {
      return false;
    }
    throw e;
  }
}

test("supprime fichier + file + objet S3 quand plus aucune référence n'existe", async () => {
  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, { nom: "x.pdf" });

  expect(await s3HasKey(fichier.key)).toBe(true);

  const supprimes = await supprimerFichiersSansAutresReferences([fichier.id], db);
  expect(supprimes).toEqual([fichier.id]);

  expect(await db("file").select("id").where({ id: fichier.id })).toHaveLength(0);
  expect(await s3HasKey(fichier.key)).toBe(false);
});

test("préserve un fichier encore référencé par dossier.espèces_impactées", async () => {
  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, { nom: "especes.pdf" });
  // attach the fichier as dossier.espèces_impactées
  await createDossier(db, { espèces_impactées: fichier.id });

  const supprimes = await supprimerFichiersSansAutresReferences([fichier.id], db);
  expect(supprimes).toEqual([]);
  expect(await db("file").select("id").where({ id: fichier.id })).toHaveLength(1);
  expect(await s3HasKey(fichier.key)).toBe(true);
});

test("traite un mix de fichiers à supprimer et à conserver", async () => {
  const s3 = await getTestS3();
  const fichierAGarder = await createFichierS3(db, s3, { nom: "keep.pdf" });
  const fichierASupprimer = await createFichierS3(db, s3, { nom: "del.pdf" });
  await createDossier(db, { espèces_impactées: fichierAGarder.id });

  const supprimes = await supprimerFichiersSansAutresReferences(
    [fichierAGarder.id, fichierASupprimer.id],
    db,
  );

  expect(supprimes).toEqual([fichierASupprimer.id]);
  expect(await db("file").select("id").where({ id: fichierAGarder.id })).toHaveLength(1);
  expect(await db("file").select("id").where({ id: fichierASupprimer.id })).toHaveLength(0);
  expect(await s3HasKey(fichierAGarder.key)).toBe(true);
  expect(await s3HasKey(fichierASupprimer.key)).toBe(false);
});
