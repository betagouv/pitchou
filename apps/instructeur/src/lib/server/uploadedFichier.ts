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
