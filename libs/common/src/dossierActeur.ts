import type { DossierActeur, Involvement } from "@pitchou/types/dossierActeur.ts";

/** Involvements kept in the dossiers list, for the search. */
export const summaryInvolvements: Involvement[] = ["deposant", "mandataire"];

/** The acteurs of the dossiers list: only their summary involvements. */
export function summaryActeurs(acteurs: DossierActeur[]): DossierActeur[] {
  return acteurs.flatMap((acteur) => {
    const involvements = acteur.involvements.filter((involvement) =>
      summaryInvolvements.includes(involvement),
    );
    return involvements.length >= 1 ? [{ ...acteur, involvements }] : [];
  });
}
