import toJSONPerserveDate from "@pitchou/common/DateToJSON.js";
import { uploadSizeError } from "$lib/upload/uploadSizeHint.ts";
import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";
import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.js";

export function readableDecisionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `L'enregistrement de la décision administrative a échoué : ${message}`;
}

export function preserveDecisionDates(decision: DecisionAdministrativeForTransfer) {
  for (const key of ["signature_date", "obligations_end_date"] as const) {
    if (decision[key])
      Object.defineProperty(decision[key], "toJSON", { value: toJSONPerserveDate });
  }
}

/**
 * Checks the chosen file, sends it to object storage and returns the reference
 * the API expects on the décision.
 */
export async function uploadDecisionFile(
  dossierId: DecisionAdministrativeForTransfer["dossier"],
  files: FileList,
): Promise<DecisionAdministrativeForTransfer["fichier_upload"]> {
  const file = files[0];
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new TypeError("Format de fichier non supporté. Formats acceptés : .pdf.");
  }
  const sizeError = uploadSizeError(files);
  if (sizeError) throw new RangeError(sizeError);
  if (!dossierId) {
    throw new TypeError("Dossier manquant pour envoyer le fichier de la décision.");
  }

  const [uploaded] = await uploadFichiers(dossierId, [file]);
  return uploaded;
}
