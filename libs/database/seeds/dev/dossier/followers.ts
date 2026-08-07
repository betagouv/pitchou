import type { Knex } from "knex";

export async function seedRandomFollowers(
  transaction: Knex.Transaction,
  agentVisibleDossiers: Map<string, number[]>,
) {
  for (const [personneId, visibleDossierIds] of agentVisibleDossiers) {
    const alreadyFollows = await transaction("edge_personne_follows_dossier")
      .where({ personne: personneId })
      .first();

    if (!alreadyFollows) {
      const randomId = visibleDossierIds[Math.floor(Math.random() * visibleDossierIds.length)];
      await transaction("edge_personne_follows_dossier").insert({
        personne: personneId,
        dossier: randomId,
      });
    }
  }
}
