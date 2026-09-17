import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import type { FieldChange } from "@pitchou/types/notification.ts";
import { TYPE_IMPACT_NOT_PROVIDED } from "$lib/especes/especesByTypeImpact.ts";

export type ImpactGroup = {
  id: string | null;
  label: string;
  impacts: FrontEndImpactOnEspece[];
  change?: FieldChange;
};

export function impactGroups(
  impacts: FrontEndImpactOnEspece[],
  changes: Map<string | null, FieldChange>,
): ImpactGroup[] {
  const groups = new Map<string | null, ImpactGroup>();
  for (const impact of impacts) {
    const id = impact.typeImpact?.identifiantPitchou ?? null;
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        label: impact.typeImpact?.libelle ?? TYPE_IMPACT_NOT_PROVIDED,
        impacts: [],
        change: changes.get(id),
      };
      groups.set(id, group);
    }
    group.impacts.push(impact);
  }
  // Deleted groups still need their own review control and the snapshot's label.
  for (const [id, change] of changes) {
    if (!groups.has(id)) groups.set(id, { id, label: change.label, impacts: [], change });
  }
  return [...groups.values()].map((group) => ({
    ...group,
    impacts: group.impacts.toSorted((a, b) =>
      a.espece.nomScientifique.localeCompare(b.espece.nomScientifique, "fr"),
    ),
  }));
}

type ImpactColumn = {
  key: Exclude<keyof FrontEndImpactOnEspece, "espece" | "typeImpact">;
  label: string;
  criterion?: string;
  /** Numeric values: the column takes the shared fixed width, the species column the rest. */
  narrow?: true;
};

const columns: ImpactColumn[] = [
  {
    key: "nombreIndividus",
    label: "Nb d’individus",
    criterion: "Nombre d'individus",
    narrow: true,
  },
  {
    key: "surfaceHabitatDetruit",
    label: "Surface habitat détruit (m²)",
    criterion: "Surface habitat détruit (m²)",
    narrow: true,
  },
  { key: "nids", label: "Nids", criterion: "Nids", narrow: true },
  { key: "oeufs", label: "Œufs", criterion: "Œufs", narrow: true },
  { key: "methode", label: "Méthode" },
  { key: "moyenDePoursuite", label: "Moyen de poursuite" },
];

export function impactColumns(impacts: FrontEndImpactOnEspece[]): ImpactColumn[] {
  return columns.filter(({ key, criterion }) =>
    impacts.some(
      (impact) =>
        (impact[key] != null && impact[key] !== "") ||
        impact.typeImpact?.criteriaAllowed.some((allowed) => allowed === criterion),
    ),
  );
}
