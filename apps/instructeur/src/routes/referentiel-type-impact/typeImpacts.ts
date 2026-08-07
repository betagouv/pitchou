import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
import type { TypeImpactRow } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

export const CLASSIFICATIONS: ClassificationEtreVivant[] = ["oiseau", "faune non-oiseau", "flore"];

/**
 * The six criterias of a type d'impact, in the order the saisie form lays them out, so that
 * reading the referential and filling the form show them the same way.
 */
export const CRITERES: { column: keyof TypeImpactRow; label: string }[] = [
  { column: "critere_methode", label: "Méthode" },
  { column: "critere_moyen_de_poursuite", label: "Moyen de poursuite" },
  { column: "critere_nombre_individus", label: "Nombre d’individus" },
  { column: "critere_nids", label: "Nids" },
  { column: "critere_oeufs", label: "Œufs" },
  { column: "critere_surface_habitat_detruit", label: "Surface habitat détruit (m²)" },
];

/** The labels of the criterias that can be filled in for this type d'impact. */
export function criteresApplicables(typeImpact: TypeImpactRow): string[] {
  return CRITERES.filter(({ column }) => typeImpact[column]).map(({ label }) => label);
}

/**
 * Groups the rows by classification in the order the rest of the app uses — oiseau, faune
 * non-oiseau, flore — rather than the alphabetical one the database returns. Within a
 * classification the rows keep the order they arrived in, which is the order of their code.
 */
export function parClassification<T extends { classification: string }>(rows: T[]): T[] {
  return CLASSIFICATIONS.flatMap((classification) =>
    rows.filter((row) => row.classification === classification),
  );
}
