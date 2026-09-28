import { error } from "@sveltejs/kit";
import { UploadedFichierError } from "@pitchou/server/database/fichier_upload.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates a `{ id, name }` reference to a file the browser sent to object
 * storage. `undefined` and `null` mean "no file"; anything else must be a
 * well-formed reference.
 */
export function parseUploadedFichier(
  value: unknown,
  property: string,
): UploadedFichier | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    error(400, `La propriété '${property}' doit être un objet.`);
  }
  const { id, name, ...rest } = value as Record<string, unknown>;
  const unknownProperty = Object.keys(rest)[0];
  if (unknownProperty) {
    error(400, `Propriété non reconnue '${property}.${unknownProperty}'.`);
  }
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    error(400, `La propriété '${property}.id' doit être un identifiant de fichier.`);
  }
  if (typeof name !== "string" || name.trim() === "") {
    error(400, `La propriété '${property}.name' doit être une chaîne non vide.`);
  }
  return { id: id as FileId, name };
}

/** Turns a registration failure into the HTTP error the browser can act on. */
export function throwUploadedFichierHttpError(err: unknown): never {
  if (err instanceof UploadedFichierError) {
    error(err.code === "too_large" ? 413 : 400, err.message);
  }
  throw err;
}
