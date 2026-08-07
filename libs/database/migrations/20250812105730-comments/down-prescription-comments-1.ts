import type { Knex } from "knex";

export function applyDownPrescriptionCommentsPart1(table: Knex.AlterTableBuilder) {
  table
    .uuid("décision_administrative")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.date("date_échéance").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("numéro_article").comment(``).alter({ alterNullable: false, alterType: false });
  table.text("description").comment(``).alter({ alterNullable: false, alterType: false });
  table.integer("surface_évitée").comment(``).alter({ alterNullable: false, alterType: false });
  table.integer("surface_compensée").comment(``).alter({ alterNullable: false, alterType: false });
  table.integer("nids_évités").comment(``).alter({ alterNullable: false, alterType: false });
  table.integer("nids_compensés").comment(``).alter({ alterNullable: false, alterType: false });
  table.integer("individus_évités").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .integer("individus_compensés")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
}
