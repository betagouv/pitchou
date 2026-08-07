import type { Knex } from "knex";

export function applyUpPrescriptionCommentsPart1(table: Knex.AlterTableBuilder) {
  table
    .uuid("décision_administrative")
    .comment(
      `Référence vers la décision administrative associée à cette prescription. Une décision administrative peut contenir plusieurs prescriptions détaillant les obligations spécifiques à respecter.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_échéance")
    .comment(
      `Date limite à laquelle la prescription doit être respectée. Les contrôles de cette prescription s'effectuent dès lors que la date d'échéance est dépassée.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("numéro_article")
    .comment(
      `Numéro de l'article de la prescription. Permet d'identifier et de référencer précisément la prescription dans le cadre de la décision administrative.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .text("description")
    .comment(
      `Description détaillée de la prescription. Explique précisément ce qui doit être fait, comment et dans quelles conditions pour respecter l'obligation imposée.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("surface_évitée")
    .comment(`Surface en m² qui a été évitée grâce aux mesures de protection mises en place.`)
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("surface_compensée")
    .comment(`Surface en m² qui a été compensée pour atténuer les impacts du projet.`)
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("nids_évités")
    .comment(
      `Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été évités grâce aux mesures de protection mises en place.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("nids_compensés")
    .comment(
      `Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été compensés pour atténuer les impacts du projet.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("individus_évités")
    .comment(
      `Nombre d'individus qui ont été évités grâce aux mesures de protection mises en place.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("individus_compensés")
    .comment(`Nombre d'individus qui ont été compensés pour atténuer les impacts du projet.`)
    .alter({ alterNullable: false, alterType: false });
}
