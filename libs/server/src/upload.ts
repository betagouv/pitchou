import { randomUUID } from "node:crypto";

import { createUploadUrl, pendingKey } from "./objectStorage.ts";

import type { UploadUrl, UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/**
 * Parses a size ("200M", "512K", "1G", "1048576", "Infinity") into bytes,
 * with the same notation adapter-node uses for BODY_SIZE_LIMIT.
 */
export function parseSizeLimit(value: string): number {
  const multiplier =
    ({ K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024 } as Record<string, number>)[
      value[value.length - 1]?.toUpperCase()
    ] ?? 1;
  return Number(multiplier !== 1 ? value.slice(0, -1) : value) * multiplier;
}

/**
 * Largest file the browser may send to object storage. Files never go through
 * the app server, so this is a product choice rather than a platform ceiling.
 * Single source of truth for the signed URL, the registration check and the
 * size hint shown in the UI. Overridable via MAX_UPLOAD_SIZE.
 */
export function getMaxUploadSizeBytes(): number {
  // `||` rather than `??`: an empty value in the environment means "use the default".
  return parseSizeLimit(process.env.MAX_UPLOAD_SIZE || "1G");
}

/** Files one signed-URL request may cover. */
export const MAX_FILES_PER_UPLOAD_REQUEST = 20;

/**
 * A client-side mistake around an upload (bad reference, object never sent,
 * too large…). HTTP routes answer with `status` and `message`.
 */
export class UploadedFichierError extends Error {
  constructor(
    readonly status: 400 | 413,
    message: string,
  ) {
    super(message);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUploadId(value: unknown): value is FileId {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

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
    throw new UploadedFichierError(400, `La propriété '${property}' doit être un objet.`);
  }
  const { id, name, ...rest } = value as Record<string, unknown>;
  const unknownProperty = Object.keys(rest)[0];
  if (unknownProperty) {
    throw new UploadedFichierError(400, `Propriété non reconnue '${property}.${unknownProperty}'.`);
  }
  if (!isUploadId(id)) {
    throw new UploadedFichierError(
      400,
      `La propriété '${property}.id' doit être un identifiant de fichier.`,
    );
  }
  if (typeof name !== "string" || name.trim() === "") {
    throw new UploadedFichierError(
      400,
      `La propriété '${property}.name' doit être une chaîne non vide.`,
    );
  }
  return { id, name };
}

/** Like parseUploadedFichier for a list; `undefined` and `null` mean an empty list. */
export function parseUploadedFichiers(value: unknown, property: string): UploadedFichier[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new UploadedFichierError(400, `La propriété '${property}' doit être une liste.`);
  }
  return value.map((item, index) => {
    const upload = parseUploadedFichier(item, `${property}[${index}]`);
    if (!upload) {
      throw new UploadedFichierError(
        400,
        `La propriété '${property}[${index}]' doit être un objet.`,
      );
    }
    return upload;
  });
}

/** Validates the `files` list of a signed-URL request and returns the byte sizes. */
export function parseUploadSizes(files: unknown): number[] {
  if (!Array.isArray(files) || files.length === 0) {
    throw new UploadedFichierError(400, "La propriété 'files' doit être une liste non vide.");
  }
  if (files.length > MAX_FILES_PER_UPLOAD_REQUEST) {
    throw new UploadedFichierError(
      400,
      `Au maximum ${MAX_FILES_PER_UPLOAD_REQUEST} fichiers par requête.`,
    );
  }
  const maxSize = getMaxUploadSizeBytes();
  return files.map((file: unknown) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      throw new UploadedFichierError(400, "Chaque élément de 'files' doit être un objet.");
    }
    const { size, ...rest } = file as Record<string, unknown>;
    const unknownProperty = Object.keys(rest)[0];
    if (unknownProperty) {
      throw new UploadedFichierError(400, `Propriété non reconnue 'files[].${unknownProperty}'.`);
    }
    if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
      throw new UploadedFichierError(
        400,
        "La propriété 'files[].size' doit être un entier strictement positif.",
      );
    }
    if (size > maxSize) {
      throw new UploadedFichierError(413, "Fichier trop volumineux.");
    }
    return size;
  });
}

/**
 * One signed PUT URL per size. The objects land under `pending/` and only
 * become files once a route registers them, so an unused URL costs nothing
 * but a short-lived object.
 */
export function createUploadUrls(sizes: number[]): Promise<UploadUrl[]> {
  return Promise.all(
    sizes.map(async (size) => {
      const id = randomUUID() as FileId;
      return { id, url: await createUploadUrl(pendingKey(id), size) };
    }),
  );
}
