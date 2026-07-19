import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { addFile, deleteFile, getFile } from "./file.ts";
import { deleteObject, fileKey, getObject, putObject } from "../objectStorage.ts";

import type File from "@pitchou/types/database/public/File.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/**
 * Builds a deduplication key for a file description.
 * Does not use created_at because DS modifies it whenever a new file is added to the same field.
 */
export function makeFichierHash(fichier: Partial<File>): string {
  return [fichier.name, fichier.media_type, fichier.demarche_numerique_checksum].join("-");
}

/**
 * Finds existing file records that match the given descriptions (used for deduplication during DS sync).
 */
export function findExistingFichiers(
  fichierDescriptions: Partial<File>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>[]> {
  return databaseConnection("file")
    .select(["id", "demarche_numerique_checksum", "name", "media_type"])
    .whereIn(
      ["demarche_numerique_checksum", "name", "media_type"],
      // @ts-ignore
      fichierDescriptions.map(({ demarche_numerique_checksum, name, media_type }) => [
        demarche_numerique_checksum,
        name,
        media_type,
      ]),
    );
}

/**
 * Uploads a file to S3 and inserts its metadata into the `file` table.
 *
 * The UUID is generated client-side to allow upload-first then DB insert.
 * If the DB insert fails, the S3 object is deleted (best-effort) before re-throwing.
 */
export async function storeNewFichier(
  fichier: {
    name: string;
    content: Buffer;
    media_type: string | null;
    demarche_numerique_checksum?: string | null;
    demarche_numerique_created_at?: Date | null;
  },
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>> {
  const { name, content, media_type, demarche_numerique_checksum, demarche_numerique_created_at } =
    fichier;
  const fileId = randomUUID() as FileId;
  const key = fileKey(fileId);

  await putObject(key, content, media_type);

  try {
    return await addFile(
      {
        id: fileId,
        name,
        media_type,
        size: String(content.byteLength),
        demarche_numerique_checksum,
        demarche_numerique_created_at,
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
  name: string;
  media_type: string | null;
  body: Readable;
  size?: number;
} | null> {
  const f = await getFile(fileId, databaseConnection);
  if (!f) return null;

  const s3 = await getObject(fileKey(fileId));
  return {
    name: f.name,
    media_type: f.media_type,
    body: s3.body,
    size: f.size ? Number(f.size) : undefined,
  };
}

// All tables/columns that can reference a file (FK -> file.id).
// Centralised here so deleteFichiersWithoutOtherReferences stays exhaustive.
const FILE_REFERENCES = [
  { table: "edge_dossier__fichier_pieces_jointes_petitionnaire", column: "fichier" },
  { table: "dossier", column: "especes_impactees" },
  { table: "decision_administrative", column: "fichier" },
  { table: "avis_expert", column: "saisine_fichier" },
  { table: "avis_expert", column: "avis_fichier" },
  { table: "other_attachment", column: "fichier" },
];

/**
 * Deletes only the file IDs that are no longer referenced by any other table.
 * Preserves files that are still in use (e.g. shared across multiple dossiers).
 *
 * Returns the IDs that were actually deleted.
 */
export async function deleteFichiersWithoutOtherReferences(
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

  const toDelete = fileIds.filter((id) => !stillReferenced.has(id));

  for (const fileId of toDelete) {
    await deleteFile(fileId, databaseConnection);
    await deleteObject(fileKey(fileId)).catch((err) => {
      console.error(`Échec suppression objet S3 pour file_id ${fileId}`, err.message);
    });
  }

  return toDelete;
}
