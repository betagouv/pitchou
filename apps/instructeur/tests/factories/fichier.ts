import { randomUUID } from "node:crypto";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import type { Knex } from "knex";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export type CreatedFile = {
  id: FileId;
  name: string;
  key: string;
  bytes: Buffer;
};

/**
 * Inserts a `file` row and uploads the bytes to S3 at `files/<id>`.
 */
export async function createFichierS3(
  db: Knex,
  s3: { client: S3Client; bucket: string },
  overrides: { name?: string; mediaType?: string; bytes?: Buffer } = {},
): Promise<CreatedFile> {
  const name = overrides.name ?? "doc.pdf";
  const mediaType = overrides.mediaType ?? "application/pdf";
  const bytes = overrides.bytes ?? Buffer.from("%PDF-1.4 stored on S3");

  const fileId = randomUUID() as FileId;
  const key = `files/${fileId}`;

  await s3.client.send(
    new PutObjectCommand({ Bucket: s3.bucket, Key: key, Body: bytes, ContentType: mediaType }),
  );

  await db("file").insert({
    id: fileId,
    name,
    media_type: mediaType,
    size: String(bytes.byteLength),
  });

  return { id: fileId, name, key, bytes };
}
