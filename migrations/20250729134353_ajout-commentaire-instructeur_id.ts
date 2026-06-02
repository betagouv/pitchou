import type { Knex } from "knex";

export function up(knex: Knex) {
  return knex.schema.alterTable("cap_écriture_annotation", (table) => {
    table
      .string("instructeur_id")
      .comment(
        `Identifiant de l'instructeur.rice dans Démarches Simplifiées. Utile pour faire référence à l'instructeur.rice dans les appels API`,
      )
      .alter({ alterNullable: false, alterType: false });
  });
}

export function down(knex: Knex) {
  return knex.schema.alterTable("cap_écriture_annotation", (table) => {
    table.string("instructeur_id").comment(``).alter({ alterNullable: false, alterType: false });
  });
}
