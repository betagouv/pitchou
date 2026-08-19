import type { Knex } from "knex";

import { SEED_DOSSIERS } from "../../fixtures/dossiers.ts";

/**
 * Turns the free comment of each seeded dossier into its first commentaire, the
 * way the migration did in production. The dossier list, the tableau de suivi and
 * the document generation read the latest commentaire, not the legacy column.
 */
export async function seedCommentaires(
  transaction: Knex.Transaction,
  dossierIdMap: Record<string, number>,
) {
  for (const { demarche_numerique_number, free_comment } of SEED_DOSSIERS) {
    const dossierId = dossierIdMap[demarche_numerique_number!];
    if (!dossierId || !free_comment?.trim()) continue;

    const existing = await transaction("commentaire").where({ dossier: dossierId }).first();
    if (existing) continue;

    // personne null: displayed as the « initial » comment, like the migrated ones.
    await transaction("commentaire").insert({
      dossier: dossierId,
      personne: null,
      content: free_comment,
    });
  }
}
