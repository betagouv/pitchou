import type { Knex } from "knex";

const constraint = "évènement_phase_dossier_dossier_phase_horodatage_unique";

export async function up(knex: Knex) {
  await knex.schema.alterTable("evenement_phase_dossier", (table) => {
    table.timestamp("recorded_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw('ALTER TABLE evenement_phase_dossier ALTER COLUMN "timestamp" DROP NOT NULL');
  await knex.raw("ALTER TABLE evenement_phase_dossier DROP CONSTRAINT ??", [constraint]);
  await knex.raw(
    'ALTER TABLE evenement_phase_dossier ADD CONSTRAINT ?? UNIQUE NULLS NOT DISTINCT (dossier, phase, "timestamp")',
    [constraint],
  );
}

export async function down(knex: Knex) {
  if (await knex("evenement_phase_dossier").whereNull("timestamp").first())
    throw new Error("Cannot require phase dates while undated events exist");
  await knex.raw("ALTER TABLE evenement_phase_dossier DROP CONSTRAINT ??", [constraint]);
  await knex.raw(
    'ALTER TABLE evenement_phase_dossier ADD CONSTRAINT ?? UNIQUE (dossier, phase, "timestamp")',
    [constraint],
  );
  await knex.raw('ALTER TABLE evenement_phase_dossier ALTER COLUMN "timestamp" SET NOT NULL');
  await knex.schema.alterTable("evenement_phase_dossier", (table) =>
    table.dropColumn("recorded_at"),
  );
}
