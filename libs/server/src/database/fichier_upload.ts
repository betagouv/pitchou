import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { addFile } from "./file.ts";
import {
  copyObject,
  deleteObject,
  fileKey,
  getObject,
  headObject,
  pendingKey,
} from "../objectStorage.ts";
import { getMaxUploadSizeBytes, isUploadId, UploadedFichierError } from "../upload.ts";

import type File from "@pitchou/types/database/public/File.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";

export { UploadedFichierError } from "../upload.ts";

/** Content types storage assigns on its own when the browser sent none. */
const DEFAULT_CONTENT_TYPES = new Set(["application/octet-stream", "binary/octet-stream"]);

export type PendingUpload = { contentLength: number; contentType: string | null };

/**
 * Size and media type of an object the browser PUT under `pending/`, as
 * storage reports them. Fails when the browser never sent it or it is above
 * the size limit (the object is then discarded).
 */
export async function headPendingUpload(upload: UploadedFichier): Promise<PendingUpload> {
  const { id, name } = upload;
  if (!isUploadId(id)) {
    throw new UploadedFichierError(400, `Identifiant de fichier invalide : ${id}`);
  }
  const head = await headObject(pendingKey(id));
  if (!head) {
    throw new UploadedFichierError(
      400,
      `Le fichier ${name} n'a pas été reçu par le stockage. Veuillez le renvoyer.`,
    );
  }
  if (head.contentLength > getMaxUploadSizeBytes()) {
    await deleteObject(pendingKey(id)).catch(() => {});
    throw new UploadedFichierError(413, `Le fichier ${name} est trop volumineux.`);
  }
  return {
    contentLength: head.contentLength,
    contentType:
      head.contentType && !DEFAULT_CONTENT_TYPES.has(head.contentType) ? head.contentType : null,
  };
}

/** The bytes of a pending upload, for routes that must inspect a file before registering it. */
export async function loadPendingUploadContent(upload: UploadedFichier): Promise<Buffer> {
  await headPendingUpload(upload);
  const { body } = await getObject(pendingKey(upload.id));
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Registers an object the browser PUT under `pending/` through a signed URL:
 * copies it under `files/`, inserts the `file` row, then drops the pending object.
 *
 * Size and media type come from storage, not from the client; `mediaType`
 * overrides the latter when the route knows better. Like storeNewFichier, a
 * failed insert deletes the copied object (best-effort) before re-throwing.
 */
export async function registerUploadedFichier(
  upload: UploadedFichier,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
  options: { mediaType?: string } = {},
): Promise<Partial<File>> {
  const { id, name } = upload;
  const pending = await headPendingUpload(upload);
  const key = fileKey(id);
  await copyObject(pendingKey(id), key);

  let file: Partial<File>;
  try {
    file = await addFile(
      {
        id,
        name,
        media_type: options.mediaType ?? pending.contentType,
        size: String(pending.contentLength),
      },
      databaseConnection,
    );
  } catch (err) {
    await deleteObject(key).catch(() => {});
    throw err;
  }

  await deleteObject(pendingKey(id)).catch((err) => {
    console.error(`Échec suppression objet S3 en attente ${pendingKey(id)}`, err);
  });
  return file;
}
