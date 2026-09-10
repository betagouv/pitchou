import type { Knex } from "knex";

export async function up(knex: Knex) {
  // These values were already displayed from personne. Moving their baseline to
  // the dossier identity must not manufacture applicant modifications on rollout.
  await knex.raw(`
    UPDATE identite_dossier AS i
    SET email = COALESCE(personne.email, i.email),
        phone = personne.phone,
        role = personne.role
    FROM dossier
    JOIN personne ON personne.id = dossier.demandeur_personne_physique
    WHERE i.dossier = dossier.id AND i.type = 'demandeur'
      AND dossier.source = 'demarche_numerique'
  `);
}

export async function down() {
  // The old reader still has the unchanged personne values; no data is deleted.
}
