import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";
import { createUploadUrls, parseUploadSizes } from "@pitchou/server/upload.ts";

// Auth is enforced upstream by hooks.server.ts (session and permissions).
/**
 * Hands the browser one signed URL per file so it can PUT the bytes straight
 * into object storage; the file gets attached by a later request.
 */
export const POST: RequestHandler = async ({ request }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["files"]));
  let sizes: number[];
  try {
    sizes = parseUploadSizes(body.files);
  } catch (err) {
    throwUploadedFichierHttpError(err);
  }
  return json(await createUploadUrls(sizes));
};
