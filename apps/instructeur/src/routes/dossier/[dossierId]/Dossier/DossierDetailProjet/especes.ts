import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import type { StatutListeRouge } from "@pitchou/types/especes.d.ts";
import {
  LIBELLES_STATUT_LISTE_ROUGE,
  STATUTS_LISTE_ROUGE,
} from "@pitchou/common/especes/listeRouge.ts";

type EspecesCounts = {
  total: number;
  cnpn: number;
  ministerielles: number;
  /** Distinct species per threatened red-list category, most threatened first. */
  listeRouge: { statut: StatutListeRouge; count: number }[];
};

export function especesCounts(impacts: FrontEndImpactOnEspece[]): EspecesCounts {
  const total = new Set<string>();
  const cnpn = new Set<string>();
  const ministerielles = new Set<string>();
  const parStatut = new Map<StatutListeRouge, Set<string>>();
  for (const { espece } of impacts) {
    total.add(espece.CD_REF);
    if (espece.especeCNPN) cnpn.add(espece.CD_REF);
    if (espece.especeMinisterielle) ministerielles.add(espece.CD_REF);
    if (espece.statutListeRouge) {
      const set = parStatut.get(espece.statutListeRouge) ?? new Set<string>();
      set.add(espece.CD_REF);
      parStatut.set(espece.statutListeRouge, set);
    }
  }
  const listeRouge = STATUTS_LISTE_ROUGE.filter((statut) => parStatut.has(statut)).map(
    (statut) => ({ statut, count: parStatut.get(statut)!.size }),
  );
  return { total: total.size, cnpn: cnpn.size, ministerielles: ministerielles.size, listeRouge };
}

/** Badge text for one red-list category, e.g. "2 vulnérables" or "1 en danger". */
export function listeRougeCountLabel({
  statut,
  count,
}: EspecesCounts["listeRouge"][number]): string {
  const label = LIBELLES_STATUT_LISTE_ROUGE[statut].toLowerCase();
  return `${count} ${label}${statut === "VU" && count > 1 ? "s" : ""}`;
}

/** Accordion-band label, e.g. "3 dont 1 CNPN et 2 ministérielles". */
export function especesCountsLabel({ total, cnpn, ministerielles }: EspecesCounts): string {
  const parts: string[] = [];
  if (cnpn) parts.push(`${cnpn} CNPN`);
  if (ministerielles)
    parts.push(`${ministerielles} ${ministerielles > 1 ? "ministérielles" : "ministérielle"}`);
  return parts.length ? `${total} dont ${parts.join(" et ")}` : `${total}`;
}
