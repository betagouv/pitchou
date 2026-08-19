/**
 * Tools that fabricate data to see how the product reacts. They must never be
 * reachable in production, where the dossiers are real.
 *
 * Staging is deployed exactly like production — same build, same `node build/index.js`,
 * so `NODE_ENV` is `production` there too. Only `PUBLIC_PITCHOU_ENV` tells the two
 * apart, as `scripts/start.sh` does to decide whether to wipe and reseed. Hence an
 * allowlist: a value that is missing or misspelled leaves the tools closed.
 */
export function simulationAllowed(): boolean {
  const environment = process.env.PUBLIC_PITCHOU_ENV;
  if (environment) return environment === "staging";
  // No environment named: a developer's machine, unless this was built to be deployed.
  return process.env.NODE_ENV !== "production";
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
