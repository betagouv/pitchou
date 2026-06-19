import type { Knex } from "knex";

export async function up(knex: Knex) {
  const fichiers = await knex("fichier").select(["id", "dossier"]).whereNotNull("dossier");

  await Promise.all(
    fichiers.map((f) => {
      const { id: fichierId, dossier: dossierId } = f;

      return knex("dossier").update({ espèces_impactées: fichierId }).where({ id: dossierId });
    }),
  );
}

export async function down(knex: Knex) {
  await knex("dossier").update({ espèces_impactées: null });
}
