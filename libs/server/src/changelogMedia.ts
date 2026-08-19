import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import { deleteObject, getObject, listObjectKeys, putObject } from "./objectStorage.ts";

// Changelog media lives under its own prefix, apart from the dossier `files/`.
const STORAGE_PREFIX = "changelog/";

/** Both apps serve an entry's media at `/changelog-media/<entryId>/<fileName>`. */
export const CHANGELOG_MEDIA_URL_PREFIX = "/changelog-media/";

/** Allowed upload types and the file extension each one gets. */
export const CHANGELOG_MEDIA_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

// Stored file names are always `<uuid>.<extension>`.
const FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/;

export function isValidMediaFileName(fileName: string): boolean {
  return FILE_NAME_PATTERN.test(fileName);
}

function mediaKey(entryId: number, fileName: string): string {
  return `${STORAGE_PREFIX}${entryId}/${fileName}`;
}

export function changelogMediaUrl(entryId: number, fileName: string): string {
  return `${CHANGELOG_MEDIA_URL_PREFIX}${entryId}/${fileName}`;
}

function ownMediaFileName(src: string, entryId: number): string | null {
  const prefix = `${CHANGELOG_MEDIA_URL_PREFIX}${entryId}/`;
  if (!src.startsWith(prefix)) return null;
  const fileName = src.slice(prefix.length);
  return isValidMediaFileName(fileName) ? fileName : null;
}

/** `true` when `src` points at a media object belonging to entry `entryId`. */
export function isOwnMediaUrl(src: string, entryId: number): boolean {
  return ownMediaFileName(src, entryId) !== null;
}

/**
 * File names of the entry's own media referenced in `contenu`. A plain regex is
 * enough because `contenu` is sanitize-html output: src attributes are always
 * double-quoted, and our URLs contain no character that gets entity-escaped.
 */
export function referencedMediaFileNames(entryId: number, contenu: string): Set<string> {
  const fileNames = new Set<string>();
  for (const match of contenu.matchAll(/src="([^"]*)"/g)) {
    const fileName = ownMediaFileName(match[1], entryId);
    if (fileName !== null) fileNames.add(fileName);
  }
  return fileNames;
}

/** Uploads one media object and returns its serving URL. */
export async function storeChangelogMedia(
  entryId: number,
  content: Buffer,
  mediaType: string,
): Promise<string> {
  const extension = CHANGELOG_MEDIA_TYPES[mediaType];
  if (!extension) throw new Error(`Type de média non autorisé : ${mediaType}`);
  const fileName = `${randomUUID()}.${extension}`;
  await putObject(mediaKey(entryId, fileName), content, mediaType);
  return changelogMediaUrl(entryId, fileName);
}

export async function getChangelogMedia(
  entryId: number,
  fileName: string,
): Promise<{ body: Readable; contentType?: string; contentLength?: number } | null> {
  if (!isValidMediaFileName(fileName)) return null;
  try {
    return await getObject(mediaKey(entryId, fileName));
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

/**
 * Streaming response for a `/changelog-media/<entry>/<file>` route, shared by
 * both apps; `null` (→ 404) for anything invalid or missing.
 */
export async function changelogMediaResponse(
  entryParam: string,
  fileName: string,
): Promise<Response | null> {
  if (!/^\d+$/.test(entryParam)) return null;
  const media = await getChangelogMedia(Number(entryParam), fileName);
  if (!media) return null;

  const headers = new Headers();
  if (media.contentType) headers.set("content-type", media.contentType);
  if (media.contentLength !== undefined) {
    headers.set("content-length", String(media.contentLength));
  }
  // A file name (uuid) never serves different bytes: cache as hard as possible.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(Readable.toWeb(media.body) as ReadableStream, { headers });
}

/** Deletes the entry's stored media that `contenu` no longer references. */
export async function cleanupChangelogMediaOrphans(
  entryId: number,
  contenu: string,
): Promise<void> {
  const referenced = referencedMediaFileNames(entryId, contenu);
  for (const key of await listObjectKeys(`${STORAGE_PREFIX}${entryId}/`)) {
    const fileName = key.split("/").pop()!;
    if (!referenced.has(fileName)) await deleteObject(key);
  }
}

export async function deleteAllChangelogMedia(entryId: number): Promise<void> {
  for (const key of await listObjectKeys(`${STORAGE_PREFIX}${entryId}/`)) {
    await deleteObject(key);
  }
}
