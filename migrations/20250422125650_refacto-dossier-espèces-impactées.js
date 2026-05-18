/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const fichiers = await knex("fichier").select(["id", "dossier"]).whereNotNull("dossier");

  await Promise.all(
    fichiers.map((f) => {
      const { id: fichierId, dossier: dossierId } = f;

      return knex("dossier").update({ espèces_impactées: fichierId }).where({ id: dossierId });
    }),
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex("dossier").update({ espèces_impactées: null });
}
