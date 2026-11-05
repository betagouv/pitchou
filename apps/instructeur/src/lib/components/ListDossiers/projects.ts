import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

/** Filter and sort demandes first, then show one representative per matching project. */
export function groupDossiersByProjet(demandes: DossierSummary[]): DossierSummary[] {
  const projects = new Map<string, DossierSummary>();
  return demandes.flatMap((demande) => {
    if (!demande.projet) return [demande];
    const existing = projects.get(demande.projet.id);
    if (existing?.projet) {
      existing.projet.matchingCount = (existing.projet.matchingCount ?? 1) + 1;
      return [];
    }
    const representative = {
      ...demande,
      name: demande.projet.name,
      projet: { ...demande.projet, matchingCount: 1 },
    };
    projects.set(demande.projet.id, representative);
    return [representative];
  });
}
