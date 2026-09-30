// Same helpers as apps/instructeur/src/lib/server/uploadedFichier.ts: `error`
// belongs to each app's SvelteKit, so the mapping lives next to the routes.
import { error } from "@sveltejs/kit";
import {
  parseUploadedFichier as parseReference,
  parseUploadedFichiers as parseReferences,
  UploadedFichierError,
} from "@pitchou/server/upload.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";

/** Turns an upload failure into the HTTP error the browser can act on. */
export function throwUploadedFichierHttpError(err: unknown): never {
  if (err instanceof UploadedFichierError) {
    error(err.status, err.message);
  }
  throw err;
}

/** `{ id, name }` reference to a file the browser sent to object storage, or undefined when absent. */
export function parseUploadedFichier(
  value: unknown,
  property: string,
): UploadedFichier | undefined {
  try {
    return parseReference(value, property);
  } catch (err) {
    throwUploadedFichierHttpError(err);
  }
}

export function parseUploadedFichiers(value: unknown, property: string): UploadedFichier[] {
  try {
    return parseReferences(value, property);
  } catch (err) {
    throwUploadedFichierHttpError(err);
  }
}

/** A `{ file }` body carrying exactly one upload reference. */
export async function readSingleUpload(request: Request): Promise<UploadedFichier> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    error(400, "Corps JSON invalide.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    error(400, "Le corps de la requête doit être un objet JSON.");
  }
  const { file, ...rest } = body as Record<string, unknown>;
  const unknownProperty = Object.keys(rest)[0];
  if (unknownProperty) error(400, `Propriété non reconnue '${unknownProperty}'.`);
  const upload = parseUploadedFichier(file, "file");
  if (!upload) error(400, "Propriété 'file' manquante.");
  return upload;
}
