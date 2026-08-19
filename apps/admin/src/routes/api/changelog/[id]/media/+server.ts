import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getChangelogEntry, isValidIdParam } from "@pitchou/server/database/changelog.ts";
import {
  CHANGELOG_MEDIA_TYPES,
  cleanupChangelogMediaOrphans,
  storeChangelogMedia,
} from "@pitchou/server/changelogMedia.ts";

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

/** Uploads one media file (multipart field `file`) and answers its serving URL. */
export const POST: RequestHandler = async ({ request, params }) => {
  const { id } = await existingEntryId(params.id);

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) {
    error(400, "Champ 'file' manquant");
  }
  if (!(file.type in CHANGELOG_MEDIA_TYPES)) {
    error(400, `Type de fichier non pris en charge : ${file.type || "inconnu"}`);
  }

  const url = await storeChangelogMedia(id, Buffer.from(await file.arrayBuffer()), file.type);
  return json({ url }, { status: 201 });
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
