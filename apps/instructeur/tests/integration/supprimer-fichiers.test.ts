import { expect, test } from "vitest";
import { HeadObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichier, createFichierS3 } from "../factories/fichier.ts";
import { createDossier } from "../factories/dossier.ts";
import { supprimerFichiersSansAutresRéférences } from "@pitchou/server/database/fichier.ts";

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

  const supprimés = await supprimerFichiersSansAutresRéférences([fichier.id], db);
  expect(supprimés).toEqual([fichier.id]);

  expect(await db("fichier").select("id").where({ id: fichier.id })).toHaveLength(0);
  expect(await db("file").select("id").where({ id: fichier.fileId })).toHaveLength(0);
  expect(await s3HasKey(fichier.key)).toBe(false);
});

test("préserve un fichier encore référencé par dossier.espèces_impactées", async () => {
  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, { nom: "especes.pdf" });
  // attach the fichier as dossier.espèces_impactées
  await createDossier(db, { espèces_impactées: fichier.id });

  const supprimés = await supprimerFichiersSansAutresRéférences([fichier.id], db);
  expect(supprimés).toEqual([]);
  expect(await db("fichier").select("id").where({ id: fichier.id })).toHaveLength(1);
  expect(await s3HasKey(fichier.key)).toBe(true);
});

test("nettoie en DB sans appeler S3 pour un fichier legacy bytea", async () => {
  const fichier = await createFichier(db, { nom: "legacy.pdf" });

  const supprimés = await supprimerFichiersSansAutresRéférences([fichier.id], db);
  expect(supprimés).toEqual([fichier.id]);
  expect(await db("fichier").select("id").where({ id: fichier.id })).toHaveLength(0);
  // pas de file row associée — rien à vérifier côté S3
});

test("traite un mix de fichiers à supprimer et à conserver", async () => {
  const s3 = await getTestS3();
  const fichierÀGarder = await createFichierS3(db, s3, { nom: "keep.pdf" });
  const fichierÀSupprimer = await createFichierS3(db, s3, { nom: "del.pdf" });
  await createDossier(db, { espèces_impactées: fichierÀGarder.id });

  const supprimés = await supprimerFichiersSansAutresRéférences(
    [fichierÀGarder.id, fichierÀSupprimer.id],
    db,
  );

  expect(supprimés).toEqual([fichierÀSupprimer.id]);
  expect(await db("fichier").select("id").where({ id: fichierÀGarder.id })).toHaveLength(1);
  expect(await db("fichier").select("id").where({ id: fichierÀSupprimer.id })).toHaveLength(0);
  expect(await s3HasKey(fichierÀGarder.key)).toBe(true);
  expect(await s3HasKey(fichierÀSupprimer.key)).toBe(false);
});
