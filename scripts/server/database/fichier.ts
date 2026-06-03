import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { addFile, deleteFile, getFile } from "./file.ts";
import { deleteObject, fileKey, getObject, putObject } from "../object-storage.ts";

import type { default as Fichier } from "../../types/database/public/Fichier.ts";
import type { FileId } from "../../types/database/public/File.ts";

/**
 * Fonction qui créé une clef unique pour la valeur de son argument
 * Cette fonction n'utilise pas le fichier.created_at, car cette valeur est modifiée
 * de manière non-souhaitée par DN
 * Spécifiquement, quand on a un champ PièceJointe avec plusieurs fichiers, si un fichier est rajouté,
 * les created_at de tous les fichiers sont modifiés à la date de l'ajout du dernier fichier
 */
export function makeFichierHash(fichier: Partial<Fichier>): string {
  return [fichier.nom, fichier.media_type, fichier.DS_checksum].join("-");
}

/**
 * Cette fonction n'utilise pas le fichier.created_at, car cette valeur est modifiée
 * de manière non-souhaitée par DN
 * Spécifiquement, quand on a un champ PièceJointe avec plusieurs fichiers, si un fichier est rajouté,
 * les created_at de tous les fichiers sont modifiés à la date de l'ajout du dernier fichier
 */
export function trouverFichiersExistants(
  descriptionsFichier: Partial<Fichier>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<Fichier>[]> {
  return databaseConnection("fichier")
    .select(["id", "DS_checksum", "nom", "media_type"])
    .whereIn(
      ["DS_checksum", "nom", "media_type"],
      // @ts-ignore
      descriptionsFichier.map(({ DS_checksum, nom, media_type }) => [DS_checksum, nom, media_type]),
    );
}

export function ajouterFichier(
  f: Partial<Fichier>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<Fichier>> {
  return databaseConnection("fichier")
    .insert(f)
    .returning(["id", "DS_checksum", "DS_createdAt", "nom", "media_type"])
    .then((files) => files[0]);
}

/**
 * Stocke un nouveau fichier : upload S3 puis insert dans `file` et `fichier`.
 *
 * UUID généré côté app pour permettre l'ordre upload-S3 → insert-DB.
 * Si l'insert DB échoue, l'objet S3 est supprimé (best-effort) avant de relancer l'erreur.
 */
export async function stockerNouveauFichier(
  fichier: {
    nom: string;
    contenu: Buffer;
    media_type: string | null;
    DS_checksum?: string | null;
    DS_createdAt?: Date | null;
  },
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<Fichier>> {
  const { nom, contenu, media_type, DS_checksum, DS_createdAt } = fichier;
  const fileId = randomUUID() as FileId;
  const key = fileKey(fileId);

  await putObject(key, contenu, media_type);

  try {
    await addFile(
      {
        id: fileId,
        nom,
        media_type,
        taille: String(contenu.byteLength),
        DS_checksum,
        DS_createdAt,
      },
      databaseConnection,
    );
    return await ajouterFichier(
      { nom, media_type, DS_checksum, DS_createdAt, file_id: fileId },
      databaseConnection,
    );
  } catch (err) {
    await deleteObject(key).catch(() => {});
    throw err;
  }
}

export function getFichier(
  fichierId: Fichier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("fichier").select("*").where("id", fichierId).first();
}

export function supprimerFichier(
  id: Fichier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("fichier").delete().where({ id });
}

/**
 * Retourne le contenu d'un fichier, soit depuis le blob legacy (`fichier.contenu`),
 * soit depuis S3 via `fichier.file_id`. Pour les fichiers S3, `body` est un stream.
 */
export async function loadFichierContent(
  fichierId: Fichier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{
  nom: string;
  media_type: string | null;
  body: Buffer | Readable;
  taille?: number;
} | null> {
  const f = await getFichier(fichierId, databaseConnection);
  if (!f) return null;

  if (f.file_id) {
    const fileMeta = await getFile(f.file_id, databaseConnection);
    const s3 = await getObject(fileKey(f.file_id));
    return {
      nom: f.nom,
      media_type: f.media_type,
      body: s3.body,
      taille: fileMeta?.taille ? Number(fileMeta.taille) : undefined,
    };
  }

  if (f.contenu !== null) {
    return {
      nom: f.nom,
      media_type: f.media_type,
      body: f.contenu,
      taille: f.contenu.byteLength,
    };
  }

  return null;
}

// Toutes les tables/colonnes qui peuvent référencer un fichier (cf. les FK vers `fichier` dans les migrations).
// Centralisé ici pour que `supprimerFichiersSansAutresRéférences` reste exhaustive.
const FICHIER_REFERENCES = [
  { table: "arête_dossier__fichier_pièces_jointes_pétitionnaire", column: "fichier" },
  { table: "dossier", column: "espèces_impactées" },
  { table: "décision_administrative", column: "fichier" },
  { table: "avis_expert", column: "saisine_fichier" },
  { table: "avis_expert", column: "avis_fichier" },
];

/**
 * Supprime du `fichier` uniquement les IDs qui ne sont plus référencés par aucune autre table.
 * Préserve les fichiers partagés entre plusieurs usages (un même contenu peut être à la fois
 * une PJ pétitionnaire, un fichier espèces impactées, un avis expert, etc.).
 *
 * Retourne les IDs effectivement supprimés.
 */
export async function supprimerFichiersSansAutresRéférences(
  fichierIds: Fichier["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Fichier["id"][]> {
  if (fichierIds.length === 0) return [];

  const stillReferenced = new Set();
  for (const { table, column } of FICHIER_REFERENCES) {
    const rows = await databaseConnection(table).select(column).whereIn(column, fichierIds);
    for (const r of rows) {
      if (r[column] !== null) stillReferenced.add(r[column]);
    }
  }

  const àSupprimer = fichierIds.filter((id) => !stillReferenced.has(id));

  if (àSupprimer.length >= 1) {
    const fileIdRows = await databaseConnection("fichier")
      .select("file_id")
      .whereIn("id", àSupprimer);
    const fileIdsÀSupprimer = fileIdRows.map((r) => r.file_id).filter((id) => id !== null);

    await databaseConnection("fichier").delete().whereIn("id", àSupprimer);

    for (const fileId of fileIdsÀSupprimer) {
      await deleteFile(fileId, databaseConnection);
      await deleteObject(fileKey(fileId)).catch((err) => {
        console.error(`Échec suppression objet S3 pour file_id ${fileId}`, err.message);
      });
    }
  }

  return àSupprimer;
}
