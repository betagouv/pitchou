import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";

type EspecesCounts = {
  total: number;
  cnpn: number;
  ministerielles: number;
};

export function especesCounts(impacts: FrontEndImpactOnEspece[]): EspecesCounts {
  return impacts.reduce(
    (acc, { espece }) => {
      if (espece.especeCNPN) acc.cnpn += 1;
      if (espece.especeMinisterielle) acc.ministerielles += 1;
      return acc;
    },
    { total: impacts.length, cnpn: 0, ministerielles: 0 },
  );
}

/** Accordion-band label, e.g. "3 dont 1 CNPN et 2 ministérielles". */
export function especesCountsLabel({ total, cnpn, ministerielles }: EspecesCounts): string {
  const parts: string[] = [];
  if (cnpn) parts.push(`${cnpn} CNPN`);
  if (ministerielles)
    parts.push(`${ministerielles} ${ministerielles > 1 ? "ministérielles" : "ministérielle"}`);
  return parts.length ? `${total} dont ${parts.join(" et ")}` : `${total}`;
}
