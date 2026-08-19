/**
 * Tools that fabricate data to see how the product reacts. They must never be
 * reachable in production, where the dossiers are real: the check is deliberately
 * doubled, so a missing or mistyped PUBLIC_PITCHOU_ENV is not enough to open them.
 */
export function simulationAllowed(): boolean {
  return process.env.PUBLIC_PITCHOU_ENV !== "production" && process.env.NODE_ENV !== "production";
}

/** Champs a simulated pétitionnaire modification may touch, with their label. */
export const simulatableChamps: { column: string; label: string }[] = [
  { column: "name", label: "Nom du projet" },
  { column: "description", label: "Description" },
  { column: "main_activite", label: "Activité principale" },
  { column: "motif_derogation", label: "Motif de la dérogation" },
  {
    column: "no_other_satisfactory_solution_justification",
    label: "Synthèse des éléments démontrant qu'il n'existe aucune alternative",
  },
  { column: "urgent_contact_phone", label: "Téléphone en cas de demande urgente" },
];
