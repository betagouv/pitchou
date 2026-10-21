import type { Knex } from "knex";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonnePhysiqueId } from "@pitchou/types/database/public/PersonnePhysique.ts";

/**
 * Deletes the given dossiers, then their personnes physiques (porteur and acteurs) that no
 * other dossier references. Entreprises are shared, so they are kept.
 */
export async function deleteDossiersWithPersonnesPhysiques(
  dossiers: Knex.QueryBuilder,
  trx: Knex.Transaction,
): Promise<DossierId[]> {
  const rows: { id: DossierId }[] = await dossiers.clone().select("dossier.id");
  const ids = rows.map(({ id }) => id);
  if (ids.length === 0) return [];
  const personnes: { id: PersonnePhysiqueId }[] = await trx
    .select("personne_physique as id")
    .from("dossier_acteur")
    .whereIn("dossier", ids)
    .union((union) =>
      union
        .select("porteur_de_projet.personne_physique as id")
        .from("dossier")
        .join("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
        .whereIn("dossier.id", ids)
        .whereNotNull("porteur_de_projet.personne_physique"),
    );
  await trx("dossier").whereIn("id", ids).delete();
  if (personnes.length > 0) {
    await trx("personne_physique")
      .whereIn(
        "id",
        personnes.map(({ id }) => id),
      )
      .whereNotExists(trx("dossier_acteur").whereRaw("personne_physique = personne_physique.id"))
      .whereNotExists(
        trx("porteur_de_projet").whereRaw(
          "porteur_de_projet.personne_physique = personne_physique.id",
        ),
      )
      .delete();
  }
  return ids;
}
