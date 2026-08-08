import { byteFormat } from "@pitchou/common/typeFormat.ts";
import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export function dateToInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function attachmentDetails(attachment: DossierFull["otherAttachments"][number]) {
  const details = [];
  if (attachment.fichier_description?.media_type)
    details.push(attachment.fichier_description.media_type);
  if (typeof attachment.fichier_description?.size === "number")
    details.push(byteFormat.format(attachment.fichier_description.size));
  if (attachment.attachment_date)
    details.push(`Date de la pièce jointe : ${formatDateAbsolute(attachment.attachment_date)}`);
  return details.join(" - ");
}

export function ddepCompositeValue(
  ddep: boolean | null | undefined,
  erSufficient: boolean | null | undefined,
) {
  if (ddep === true) return "oui" as const;
  if (ddep === false)
    return erSufficient ? ("non_er_mesures_sufficient" as const) : ("non_sans_objet" as const);
  return "a_determiner" as const;
}
