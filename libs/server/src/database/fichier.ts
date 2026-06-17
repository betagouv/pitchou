import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { addFile, deleteFile } from "./file.ts";
import { deleteObject, fileKey, getObject, putObject } from "../object-storage.ts";

import type File from "@pitchou/types/database/public/File.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/**
 * Builds a deduplication key for a file description.
 * Does not use created_at because DS modifies it whenever a new file is added to the same field.
 */
export function makeFichierHash(fichier: Partial<File>): string {
  return [fichier.nom, fichier.media_type, fichier.DS_checksum].join("-");
}

/**
 * Finds existing file records that match the given descriptions (used for deduplication during DS sync).
 */
export function trouverFichiersExistants(
  descriptionsFichier: Partial<File>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>[]> {
  return databaseConnection("file")
    .select(["id", "DS_checksum", "nom", "media_type"])
    .whereIn(
      ["DS_checksum", "nom", "media_type"],
      // @ts-ignore
      descriptionsFichier.map(({ DS_checksum, nom, media_type }) => [DS_checksum, nom, media_type]),
    );
}

/**
 * Uploads a file to S3 and inserts its metadata into the `file` table.
 *
 * The UUID is generated client-side to allow upload-first then DB insert.
 * If the DB insert fails, the S3 object is deleted (best-effort) before re-throwing.
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
): Promise<Partial<File>> {
  const { nom, contenu, media_type, DS_checksum, DS_createdAt } = fichier;
  const fileId = randomUUID() as FileId;
  const key = fileKey(fileId);

  await putObject(key, contenu, media_type);

  try {
    return await addFile(
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
  } catch (err) {
    await deleteObject(key).catch(() => {});
    throw err;
  }
}

/**
 * Returns the content of a file from S3.
 * `body` is a Node.js Readable stream.
 */
export async function loadFichierContent(
  fileId: FileId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{
  nom: string;
  media_type: string | null;
  body: Readable;
  taille?: number;
} | null> {
  const f = await databaseConnection("file")
    .select(["nom", "media_type", "taille"])
    .where("id", fileId)
    .first();
  if (!f) return null;

  const s3 = await getObject(fileKey(fileId));
  return {
    nom: f.nom,
    media_type: f.media_type,
    body: s3.body,
    taille: f.taille ? Number(f.taille) : undefined,
  };
}

// All tables/columns that can reference a file (FK -> file.id).
// Centralised here so supprimerFichiersSansAutresRéférences stays exhaustive.
const FILE_REFERENCES = [
  { table: "arête_dossier__fichier_pièces_jointes_pétitionnaire", column: "fichier" },
  { table: "dossier", column: "espèces_impactées" },
  { table: "décision_administrative", column: "fichier" },
  { table: "avis_expert", column: "saisine_fichier" },
  { table: "avis_expert", column: "avis_fichier" },
];

/**
 * Deletes only the file IDs that are no longer referenced by any other table.
 * Preserves files that are still in use (e.g. shared across multiple dossiers).
 *
 * Returns the IDs that were actually deleted.
 */
export async function supprimerFichiersSansAutresRéférences(
  fileIds: FileId[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FileId[]> {
  if (fileIds.length === 0) return [];

  const stillReferenced = new Set<string>();
  for (const { table, column } of FILE_REFERENCES) {
    const rows = await databaseConnection(table).select(column).whereIn(column, fileIds);
    for (const r of rows) {
      if (r[column] !== null) stillReferenced.add(r[column]);
    }
  }

  const àSupprimer = fileIds.filter((id) => !stillReferenced.has(id));

  for (const fileId of àSupprimer) {
    await deleteFile(fileId, databaseConnection);
    await deleteObject(fileKey(fileId)).catch((err) => {
        console.error(`Échec suppression objet S3 pour file_id ${fileId}`, err.message);
    });
  }

  return àSupprimer;
}