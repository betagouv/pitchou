import type { Knex } from "knex";

export function applyUpDecisionAdministrativeCommentsPart1(table: Knex.AlterTableBuilder) {
  table
    .integer("dossier")
    .comment(
      `Référence vers le dossier associé à cette décision administrative. Un dossier peut avoir plusieurs décisions administratives au cours de son instruction (ex: arrêté préfectoral, arrêté ministériel, etc.).`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("numéro")
    .comment(
      `Numéro officiel de la décision administrative. Ce numéro est généralement attribué par l'administration et permet d'identifier formellement la décision dans les systèmes administratifs.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("type")
    .comment(
      `Type de décision administrative. Peut être par exemple : Arrêté refus, Arrêté modification, Arrêté dérogation, Autre décision...`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_signature")
    .comment(
      `Date de signature de la décision administrative par l'autorité compétente. Cette date marque l'entrée en vigueur de la décision et le début des obligations pour le bénéficiaire.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_fin_obligations")
    .comment(
      `Date de fin des obligations imposées par la décision administrative. Cette date marque la fin de la période de validité de la décision et des prescriptions associées.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .uuid("fichier")
    .comment(`Référence vers le fichier contenant la décision administrative.`)
    .alter({ alterNullable: false, alterType: false });
}
