import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";

type EspecesCounts = {
  total: number;
  cnpn: number;
  ministerielles: number;
};

export function especesCounts(impacts: FrontEndImpactOnEspece[]): EspecesCounts {
  const total = new Set<string>();
  const cnpn = new Set<string>();
  const ministerielles = new Set<string>();
  for (const { espece } of impacts) {
    total.add(espece.CD_REF);
    if (espece.especeCNPN) cnpn.add(espece.CD_REF);
    if (espece.especeMinisterielle) ministerielles.add(espece.CD_REF);
  }
  return { total: total.size, cnpn: cnpn.size, ministerielles: ministerielles.size };
}

/** Accordion-band label, e.g. "3 dont 1 CNPN et 2 ministérielles". */
export function especesCountsLabel({ total, cnpn, ministerielles }: EspecesCounts): string {
  const parts: string[] = [];
  if (cnpn) parts.push(`${cnpn} CNPN`);
  if (ministerielles)
    parts.push(`${ministerielles} ${ministerielles > 1 ? "ministérielles" : "ministérielle"}`);
  return parts.length ? `${total} dont ${parts.join(" et ")}` : `${total}`;
}
