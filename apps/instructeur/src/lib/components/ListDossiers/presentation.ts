import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { porteurDeProjetName } from "$lib/dossier/displayDossier.ts";

/** Cards show the porteur de projet's name only; other dossier views still include the SIRET. */
export function applicantName(dossier: DossierSummary): string {
  return porteurDeProjetName(dossier.porteur_de_projet) ?? "Non renseigné";
}
