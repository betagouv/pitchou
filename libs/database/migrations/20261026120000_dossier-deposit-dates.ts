import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("dossier", (table) => {
    table.setNullable("depot_date");
    table
      .date("ddep_depot_date")
      .nullable()
      .comment(
        "Date on which the DDEP was submitted, independent of the initial deposit or first contact.",
      );
  });
  await knex.raw(
    `COMMENT ON COLUMN dossier.depot_date IS 'Date of the initial deposit or first contact, when known. Independent of the DDEP deposit date.'`,
  );
}

export async function down(knex: Knex): Promise<void> {
  const missingDeposit = await knex("dossier").whereNull("depot_date").first("id");
  if (missingDeposit) {
    throw new Error(
      "Cannot restore required depot_date while dossiers have an unknown deposit date.",
    );
  }
  await knex.schema.alterTable("dossier", (table) => {
    table.dropNullable("depot_date");
    table.dropColumn("ddep_depot_date");
  });
  await knex.raw(
    `COMMENT ON COLUMN dossier.depot_date IS 'Date on which the protected espece derogation request was received by the instructeurs.'`,
  );
}
