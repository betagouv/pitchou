import { randomUUID } from "node:crypto";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import type { Knex } from "knex";
import type Fichier from "$types/database/public/Fichier.ts";
import type { FileId } from "$types/database/public/File.ts";

export type CreatedFichier = {
  id: Fichier["id"];
  nom: string;
};

export type CreatedFichierS3 = CreatedFichier & {
  fileId: FileId;
  key: string;
  bytes: Buffer;
};

export async function createFichier(
  db: Knex,
  overrides: { nom?: string; mediaType?: string; contenu?: Buffer } = {},
): Promise<CreatedFichier> {
  const insert = {
    nom: overrides.nom ?? "saisine.pdf",
    media_type: overrides.mediaType ?? "application/pdf",
    contenu: overrides.contenu ?? Buffer.from("%PDF-1.4 test"),
  };
  const [row] = await db("fichier").insert(insert).returning(["id", "nom"]);
  return { id: row.id, nom: row.nom };
}

/**
 * Inserts a `file` row, uploads the bytes to S3 at `files/<id>`, then inserts
 * a `fichier` shim row with `contenu = NULL` and `file_id` pointing at the
 * file. Returns the fichier id (used by FK columns) along with the file id
 * and the S3 key.
 */
export async function createFichierS3(
  db: Knex,
  s3: { client: S3Client; bucket: string },
  overrides: { nom?: string; mediaType?: string; bytes?: Buffer } = {},
): Promise<CreatedFichierS3> {
  const nom = overrides.nom ?? "doc.pdf";
  const mediaType = overrides.mediaType ?? "application/pdf";
  const bytes = overrides.bytes ?? Buffer.from("%PDF-1.4 stored on S3");

  const fileId = randomUUID();
  const key = `files/${fileId}`;

  await s3.client.send(
    new PutObjectCommand({ Bucket: s3.bucket, Key: key, Body: bytes, ContentType: mediaType }),
  );

  await db("file").insert({
    id: fileId,
    nom,
    media_type: mediaType,
    taille: String(bytes.byteLength),
  });
  const [fichier] = await db("fichier")
    .insert({ nom, media_type: mediaType, file_id: fileId })
    .returning(["id", "nom"]);

  return { id: fichier.id, nom: fichier.nom, fileId: fileId as FileId, key, bytes };
}
