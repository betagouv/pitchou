import type { Knex } from "knex";

export function applyDownDecisionAdministrativeCommentsPart1(table: Knex.AlterTableBuilder) {
  table.integer("dossier").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("numéro").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("type").comment(``).alter({ alterNullable: false, alterType: false });
  table.date("date_signature").comment(``).alter({ alterNullable: false, alterType: false });
  table.date("date_fin_obligations").comment(``).alter({ alterNullable: false, alterType: false });
  table.uuid("fichier").comment(``).alter({ alterNullable: false, alterType: false });
}
