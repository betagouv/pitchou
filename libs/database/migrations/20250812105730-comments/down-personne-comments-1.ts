import type { Knex } from "knex";

export function applyDownPersonneCommentsPart1(table: Knex.AlterTableBuilder) {
  table.string("nom").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("prénoms").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("email").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("code_accès").comment(``).alter({ alterNullable: false, alterType: false });
}
