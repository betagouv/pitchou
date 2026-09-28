import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getChangelogEntry, isValidIdParam } from "@pitchou/server/database/changelog.ts";
import {
  cleanupChangelogMediaOrphans,
  registerChangelogMediaUpload,
} from "@pitchou/server/changelogMedia.ts";
import { readSingleUpload, throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";

async function existingEntryId(idParam: string | undefined) {
  if (!idParam || !isValidIdParam(idParam)) {
    error(400, "Paramètre 'id' invalide");
  }
  const entry = await getChangelogEntry(Number(idParam));
  if (!entry) {
    error(404, "Entrée de changelog introuvable");
  }
  return { id: Number(idParam), entry };
}

/** Registers a media file the browser sent to storage (`{ file: { id, name } }`) and answers its serving URL. */
export const POST: RequestHandler = async ({ request, params }) => {
  const { id } = await existingEntryId(params.id);
  const upload = await readSingleUpload(request);

  try {
    return json({ url: await registerChangelogMediaUpload(id, upload) }, { status: 201 });
  } catch (err) {
    throwUploadedFichierHttpError(err);
  }
};

/**
 * Deletes the entry's stored media that the *saved* contenu no longer
 * references. The editor calls this when opening and when leaving an entry —
 * not on every autosave, so undoing an image removal keeps working meanwhile.
 */
export const DELETE: RequestHandler = async ({ params }) => {
  const { id, entry } = await existingEntryId(params.id);
  await cleanupChangelogMediaOrphans(id, entry.contenu);
  return new Response(null, { status: 204 });
};
