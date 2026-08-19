import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

type EspecesCounts = {
  total: number;
  cnpn: number;
  ministerielles: number;
};

export function especesCounts(description: DescriptionMenacesEspeces): EspecesCounts {
  const allEspecesImpactees = [
    ...(description["faune non-oiseau"] ?? []),
    ...(description["flore"] ?? []),
    ...(description["oiseau"] ?? []),
  ];

  return allEspecesImpactees.reduce(
    (acc, { espèce: espece }) => {
      if (espece.espèceCNPN) acc.cnpn += 1;
      if (espece.espèceMinistérielle) acc.ministerielles += 1;
      return acc;
    },
    { total: allEspecesImpactees.length, cnpn: 0, ministerielles: 0 },
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
