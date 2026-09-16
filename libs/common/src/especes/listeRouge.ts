import type { StatutListeRouge } from "@pitchou/types/especes.d.ts";

/** BDC-Statuts type of the national IUCN red list, the only list the interface reports. */
export const CD_TYPE_STATUT_LISTE_ROUGE_NATIONALE = "LRN";

/** The categories the interface flags, most threatened first. */
export const STATUTS_LISTE_ROUGE: readonly StatutListeRouge[] = ["CR", "EN", "VU"];

/** Labels shown to instructeurs, as the UICN comité français writes them. */
export const LIBELLES_STATUT_LISTE_ROUGE: Record<StatutListeRouge, string> = {
  CR: "En danger critique",
  EN: "En danger",
  VU: "Vulnérable",
};

export function isStatutListeRouge(value: unknown): value is StatutListeRouge {
  return STATUTS_LISTE_ROUGE.includes(value as StatutListeRouge);
}

/**
 * The most threatened category among a species' national red-list codes, or null when
 * none of them is a threatened category (LC, NT, DD, NA…).
 *
 * A species can carry several LRN rows (successive lists, and for birds the nicheurs /
 * hivernants / de passage lists), so the worst one wins. "CR*" (possibly extinct) counts
 * as CR.
 */
export function statutListeRougeLePlusMenace(codes: Iterable<string>): StatutListeRouge | null {
  let worst: StatutListeRouge | null = null;
  for (const raw of codes) {
    const code = raw.replace(/\*$/, "");
    if (!isStatutListeRouge(code)) continue;
    if (worst === null || STATUTS_LISTE_ROUGE.indexOf(code) < STATUTS_LISTE_ROUGE.indexOf(worst)) {
      worst = code;
    }
  }
  return worst;
}
