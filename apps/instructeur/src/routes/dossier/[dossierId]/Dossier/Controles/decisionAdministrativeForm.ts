import toJSONPerserveDate from "@pitchou/common/DateToJSON.js";
import { uploadSizeError } from "$lib/upload/uploadSizeHint.ts";
import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.js";

export function readableDecisionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return /^413\b/.test(message)
    ? "Le fichier est trop volumineux pour être envoyé."
    : `L'enregistrement de la décision administrative a échoué : ${message}`;
}

export function preserveDecisionDates(decision: DecisionAdministrativeForTransfer) {
  for (const key of ["signature_date", "obligations_end_date"] as const) {
    if (decision[key])
      Object.defineProperty(decision[key], "toJSON", { value: toJSONPerserveDate });
  }
}

export async function readDecisionFile(
  files: FileList,
): Promise<DecisionAdministrativeForTransfer["fichier_base64"]> {
  const file = files[0];
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new TypeError("Format de fichier non supporté. Formats acceptés : .pdf.");
  }
  const sizeError = uploadSizeError(files);
  if (sizeError) throw new RangeError(sizeError);

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string), false);
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    media_type: file.type,
    contenuBase64: dataUrl.slice(`data:${file.type};base64,`.length),
  };
}
