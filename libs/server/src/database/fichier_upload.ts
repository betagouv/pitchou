import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { addFile } from "./file.ts";
import { copyObject, deleteObject, fileKey, headObject, pendingKey } from "../objectStorage.ts";
import { getMaxUploadSizeBytes } from "../uploadLimit.ts";

import type File from "@pitchou/types/database/public/File.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";

/** Raised when the browser's upload cannot be registered; HTTP routes turn it into a 4xx. */
export class UploadedFichierError extends Error {
  constructor(
    readonly code: "not_found" | "too_large",
    message: string,
  ) {
    super(message);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Content types storage assigns on its own when the browser sent none. */
const DEFAULT_CONTENT_TYPES = new Set(["application/octet-stream", "binary/octet-stream"]);

/**
 * Registers an object the browser PUT under `pending/` through a signed URL:
 * copies it under `files/`, inserts the `file` row, then drops the pending object.
 *
 * Size and media type come from storage, not from the client. Like
 * storeNewFichier, a failed insert deletes the copied object (best-effort)
 * before re-throwing.
 */
export async function registerUploadedFichier(
  upload: UploadedFichier,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>> {
  const { id, name } = upload;
  if (!UUID_PATTERN.test(id)) {
    throw new UploadedFichierError("not_found", `Identifiant de fichier invalide : ${id}`);
  }
  const pending = pendingKey(id);
  const head = await headObject(pending);
  if (!head) {
    throw new UploadedFichierError(
      "not_found",
      `Le fichier ${name} n'a pas été reçu par le stockage. Veuillez le renvoyer.`,
    );
  }
  if (head.contentLength > getMaxUploadSizeBytes()) {
    await deleteObject(pending).catch(() => {});
    throw new UploadedFichierError("too_large", `Le fichier ${name} est trop volumineux.`);
  }

  const key = fileKey(id);
  await copyObject(pending, key);

  let file: Partial<File>;
  try {
    file = await addFile(
      {
        id: id as FileId,
        name,
        media_type:
          head.contentType && !DEFAULT_CONTENT_TYPES.has(head.contentType)
            ? head.contentType
            : null,
        size: String(head.contentLength),
      },
      databaseConnection,
    );
  } catch (err) {
    await deleteObject(key).catch(() => {});
    throw err;
  }

  await deleteObject(pending).catch((err) => {
    console.error(`Échec suppression objet S3 en attente ${pending}`, err);
  });
  return file;
}
