import type { Knex } from "knex";

export function applyUpDossierCommentsPart2(table: Knex.AlterTableBuilder) {
  table
    .string("prochaine_action_attendue_par")
    .comment(
      `Indique qui doit effectuer la prochaine action (Instructeur, CNPN/CSRPN, Consultation du public, Pétitionnaire, Autre administration...)`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("activité_principale")
    .comment(
      `Catégorie normalisée décrivant le secteur ou le type d'activité à l'origine de la demande de dérogation relative aux espèces protégées. Les valeurs possibles couvrent différents domaines (production d'énergie renouvelable, infrastructures de transport, carrières, urbanisation, gestion de l'eau, restauration écologique, etc.) et permettent de classer les dossiers selon la nature de l'intervention.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .uuid("espèces_impactées")
    .comment(`Référence vers le fichier des espèces impactées`)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("description")
    .comment(`Description synthétique du projet`)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_début_intervention")
    .comment(`Date de début de l'intervention`)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_fin_intervention")
    .comment(`Date de fin de l'intervention`)
    .alter({ alterNullable: false, alterType: false });
  table
    .float("durée_intervention")
    .comment(
      `Peut être différente de (date_fin_intervention - date_début_intervention) dans le cas des dérogations pluri-annuelles avec une petite période d'intervention annuelle`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .json("scientifique_type_demande")
    .comment(
      `Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Ce champ correspond à la liste des opérations envisagées dans le cadre de la demande de dérogation espèces protégées, choisies parmi des catégories prédéfinies (par ex. capture et relâcher immédiat sur place avec ou sans marquage, prélèvement de matériel biologique, autres cas spécifiques). Plusieurs types peuvent être sélectionnés pour une même demande.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_description_protocole_suivi")
    .comment(
      `Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Description du protocole scientifique prévu (ex. capture et relâcher immédiat avec ou sans marquage, prélèvement de matériel biologique, autres cas).`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .json("scientifique_mode_capture")
    .comment(
      `Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Modes de capture utilisés`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_modalités_source_lumineuses")
    .comment(`null signifie qu'il n'y a pas d'utilisation de sources lumineuses`)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_modalités_marquage")
    .comment(`Modalités de marquage des individus`)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_modalités_transport")
    .comment(`Modalités de transport des individus`)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_périmètre_intervention")
    .comment(`Périmètre géographique de l'intervention scientifique`)
    .alter({ alterNullable: false, alterType: false });
  table
    .json("scientifique_intervenants")
    .comment(`Liste des intervenants scientifiques`)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_précisions_autres_intervenants")
    .comment(`Précisions sur les autres intervenants scientifiques`)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("justification_absence_autre_solution_satisfaisante")
    .comment(`Article L411-2 I.4 du code de l'environnement`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("motif_dérogation")
    .comment(`Article L411-2 I.4 a) b) c) d) e) du code de l'environnement`)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("justification_motif_dérogation")
    .comment(`Justification du motif de dérogation`)
    .alter({ alterNullable: false, alterType: false });
  table
    .boolean("mesures_erc_prévues")
    .comment(`Indique si des mesures ERC (Éviter, Réduire, Compenser) sont prévues`)
    .alter({ alterNullable: false, alterType: false });
}
