import type { Knex } from "knex";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonnePhysiqueId } from "@pitchou/types/database/public/PersonnePhysique.ts";
import type { DossierActeur, Involvement } from "@pitchou/types/dossierActeur.ts";

/**
 * The acteurs of each dossier, one entry per personne physique with all its involvements,
 * optionally restricted to some involvements.
 */
export async function getDossierActeurs(
  dossierIds: DossierId[],
  databaseConnection: Knex.Transaction | Knex,
  involvements?: Involvement[],
): Promise<Map<DossierId, DossierActeur[]>> {
  const query = databaseConnection("dossier_acteur")
    .join("personne_physique", "personne_physique.id", "dossier_acteur.personne_physique")
    .select(
      "dossier_acteur.dossier",
      "dossier_acteur.involvement",
      "personne_physique.id",
      "personne_physique.first_names",
      "personne_physique.last_name",
      "personne_physique.email",
      "personne_physique.address",
      "personne_physique.phone",
      "personne_physique.role",
    )
    .whereIn("dossier_acteur.dossier", dossierIds)
    .orderBy(["personne_physique.id", "dossier_acteur.id"]);
  if (involvements) query.whereIn("dossier_acteur.involvement", involvements);
  const rows: ({ dossier: DossierId; involvement: Involvement; id: PersonnePhysiqueId } & Omit<
    DossierActeur,
    "involvements"
  >)[] = await query;

  const acteursByDossier = new Map<DossierId, Map<PersonnePhysiqueId, DossierActeur>>();
  for (const { dossier, involvement, id, ...personne } of rows) {
    const acteurs = acteursByDossier.get(dossier) ?? new Map();
    acteursByDossier.set(dossier, acteurs);
    const acteur = acteurs.get(id) ?? { involvements: [], ...personne };
    acteur.involvements.push(involvement);
    acteurs.set(id, acteur);
  }
  return new Map(
    [...acteursByDossier].map(([dossier, acteurs]) => [dossier, [...acteurs.values()]]),
  );
}
