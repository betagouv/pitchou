import type { Knex } from "knex";

export function applyDownControleCommentsPart1(table: Knex.AlterTableBuilder) {
  table.uuid("prescription").comment(``).alter({ alterNullable: false, alterType: false });
  table.datetime("date_contrôle").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("résultat").comment(``).alter({ alterNullable: false, alterType: false });
  table.text("commentaire").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .string("type_action_suite_contrôle")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_action_suite_contrôle")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_prochaine_échéance")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
}
