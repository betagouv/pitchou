import { error } from "@sveltejs/kit";
import { assertSpeciesSpreadsheet } from "@pitchou/common/especesUtils.ts";
import { loadPendingUploadContent } from "@pitchou/server/database/fichier_upload.ts";
import type { AdminFileUpload } from "@pitchou/server/database/dossier_admin_files.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import { speciesFileError, speciesFileMediaType } from "$lib/speciesFile.ts";
import { throwUploadedFichierHttpError } from "./uploadedFichier.ts";

/**
 * Checks a species spreadsheet the browser sent to storage (its name, then the
 * sheet itself) and returns it ready to register with the right media type.
 */
export async function validateSpeciesUpload(upload: UploadedFichier): Promise<AdminFileUpload> {
  const fileError = speciesFileError(upload);
  if (fileError) error(400, fileError);

  let content: Buffer;
  try {
    content = await loadPendingUploadContent(upload);
  } catch (err) {
    throwUploadedFichierHttpError(err);
  }
  try {
    await assertSpeciesSpreadsheet(
      content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      ) as ArrayBuffer,
    );
  } catch (caught) {
    error(400, caught instanceof Error ? caught.message : "Le tableur n'est pas valide.");
  }
  return { ...upload, media_type: speciesFileMediaType(upload.name) };
}
