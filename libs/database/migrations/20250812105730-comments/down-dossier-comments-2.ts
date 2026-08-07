import type { Knex } from "knex";

export function applyDownDossierCommentsPart2(table: Knex.AlterTableBuilder) {
  table
    .text("scientifique_modalités_source_lumineuses")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_modalités_marquage")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_modalités_transport")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_périmètre_intervention")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .json("scientifique_intervenants")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_précisions_autres_intervenants")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("justification_absence_autre_solution_satisfaisante")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.string("motif_dérogation").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .text("justification_motif_dérogation")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .boolean("mesures_erc_prévues")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
}
