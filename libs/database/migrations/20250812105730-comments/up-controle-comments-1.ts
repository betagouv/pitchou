import type { Knex } from "knex";

export function applyUpControleCommentsPart1(table: Knex.AlterTableBuilder) {
  table
    .uuid("prescription")
    .comment(
      `Référence vers la prescription associée à ce contrôle. Une prescription peut avoir plusieurs contrôles pour assurer le suivi de sa mise en œuvre.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .datetime("date_contrôle")
    .comment(
      `Date et heure précise à laquelle le contrôle a été effectué. Permet de tracer la chronologie des vérifications et de planifier les contrôles futurs.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("résultat")
    .comment(
      `Résultat du contrôle effectué. Pour le moment, c'est une chaîne libre. À terme, les valeurs pourront être standardisées (ex: Conforme, Non conforme, Conforme avec réserves, etc.) pour faciliter l'analyse et le reporting.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .text("commentaire")
    .comment(
      `Commentaires détaillés de l'inspecteur sur le contrôle effectué. Peut inclure des observations sur l'état de mise en œuvre, des difficultés rencontrées, des recommandations, etc.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("type_action_suite_contrôle")
    .comment(
      `Type d'action à entreprendre suite au contrôle. Pour le moment, c'est une chaîne libre. Exemples : email, courrier, etc.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_action_suite_contrôle")
    .comment(
      `Date à laquelle l'action suite au contrôle a été effectuée. Elle est souvent égale à la date_contrôle, mais peut être différente si l'instructeur.rice ne fait pas les suites dans la foulée du contrôle`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_prochaine_échéance")
    .comment(
      `Date de la prochaine échéance de contrôle programmée. Permet de planifier le suivi de la prescription et de prévoir un autre contrôle.`,
    )
    .alter({ alterNullable: false, alterType: false });
}
