import type { ClassificationEtreVivant, EspeceProtegee } from "@pitchou/types/especes.d.ts";
import type { Statut } from "@pitchou/ui/especes/especesList.ts";
import { CLASSIFICATION_EMOJI } from "@pitchou/ui/especes/classificationEmoji.ts";

export type InstanceConsultative = "cnpn" | "ministerielle";

export const CLASSIFICATION_OPTIONS: {
  value: ClassificationEtreVivant;
  label: string;
  emoji: string;
}[] = [
  { value: "oiseau", label: "Oiseau", emoji: CLASSIFICATION_EMOJI.oiseau },
  {
    value: "faune non-oiseau",
    label: "Faune non oiseau",
    emoji: CLASSIFICATION_EMOJI["faune non-oiseau"],
  },
  { value: "flore", label: "Flore", emoji: CLASSIFICATION_EMOJI.flore },
];

export const STATUT_OPTIONS: { value: Statut; label: string }[] = [
  { value: "PN", label: "PN (protection nationale)" },
  { value: "PR", label: "PR (protection régionale)" },
  { value: "PD", label: "PD (protection départementale)" },
  { value: "POM", label: "POM (protection en outre-mer)" },
];

export const INSTANCE_OPTIONS: { value: InstanceConsultative; label: string }[] = [
  { value: "cnpn", label: "CNPN (Conseil national du patrimoine naturel)" },
  { value: "ministerielle", label: "Ministère" },
];

export type EspecesFilters = {
  classifications: ClassificationEtreVivant[];
  statuts: Statut[];
  instances: InstanceConsultative[];
};

export function emptyEspecesFilters(): EspecesFilters {
  return { classifications: [], statuts: [], instances: [] };
}

export function countEspecesFilters(filters: EspecesFilters): number {
  return filters.classifications.length + filters.statuts.length + filters.instances.length;
}

function matchesInstance(espece: EspeceProtegee, instance: InstanceConsultative): boolean {
  return instance === "cnpn" ? espece.espèceCNPN === "O" : espece.espèceMinistérielle === "O";
}

export function matchesEspeceFilters(espece: EspeceProtegee, filters: EspecesFilters): boolean {
  if (filters.classifications.length && !filters.classifications.includes(espece.classification)) {
    return false;
  }
  if (filters.statuts.length && !filters.statuts.some((s) => espece.CD_TYPE_STATUTS.has(s))) {
    return false;
  }
  if (filters.instances.length && !filters.instances.some((i) => matchesInstance(espece, i))) {
    return false;
  }
  return true;
}
