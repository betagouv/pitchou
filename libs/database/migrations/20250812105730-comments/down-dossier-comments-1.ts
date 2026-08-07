import type { Knex } from "knex";

export function applyDownDossierCommentsPart1(table: Knex.AlterTableBuilder) {
  table
    .string("id_demarches_simplifiées")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.dateTime("date_dépôt").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .string("espèces_protégées_concernées")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.json("départements").comment(``).alter({ alterNullable: false, alterType: false });
  table.json("communes").comment(``).alter({ alterNullable: false, alterType: false });
  table.json("régions").comment(``).alter({ alterNullable: false, alterType: false });
  table.integer("déposant").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .integer("demandeur_personne_physique")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("demandeur_personne_morale", 14)
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.string("nom").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .string("number_demarches_simplifiées")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("historique_nom_porteur")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("historique_localisation")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.string("ddep_nécessaire").comment(``).alter({ alterNullable: false, alterType: false });
  table.boolean("enjeu_politique").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("commentaire_libre").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .date("historique_date_envoi_dernière_contribution")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("historique_identifiant_demande_onagre")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("historique_date_saisine_csrpn")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("historique_date_saisine_cnpn")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.date("date_avis_csrpn").comment(``).alter({ alterNullable: false, alterType: false });
  table.date("date_avis_cnpn").comment(``).alter({ alterNullable: false, alterType: false });
  table.string("avis_csrpn_cnpn").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .date("date_consultation_public")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.boolean("enjeu_écologique").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .boolean("rattaché_au_régime_ae")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("prochaine_action_attendue_par")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.string("activité_principale").comment(``).alter({ alterNullable: false, alterType: false });
  table.uuid("espèces_impactées").comment(``).alter({ alterNullable: false, alterType: false });
  table.text("description").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .date("date_début_intervention")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table.date("date_fin_intervention").comment(``).alter({ alterNullable: false, alterType: false });
  table.float("durée_intervention").comment(``).alter({ alterNullable: false, alterType: false });
  table
    .json("scientifique_type_demande")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .text("scientifique_description_protocole_suivi")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
  table
    .json("scientifique_mode_capture")
    .comment(``)
    .alter({ alterNullable: false, alterType: false });
}
