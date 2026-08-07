import type { Knex } from "knex";

export function applyUpDossierCommentsPart1(table: Knex.AlterTableBuilder) {
  table
    .string("id_demarches_simplifiées")
    .comment(
      `Identifiant unique du dossier dans la plateforme Démarches Simplifiées. Utile uniquement pour certaines mutations de l'API GraphQL. Utiliser plutôt le number_demarches_simplifiées`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .dateTime("date_dépôt")
    .comment(
      `Date à laquelle la demande de dérogation Espèce Protégée a été reçue par les instructeur.i.ces.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("espèces_protégées_concernées")
    .comment(`Liste des espèces protégées concernées par le dossier`)
    .alter({ alterNullable: false, alterType: false });
  table
    .json("départements")
    .comment(`Liste des départements concernés par le projet`)
    .alter({ alterNullable: false, alterType: false });
  table
    .json("communes")
    .comment(`Liste des communes concernées par le projet`)
    .alter({ alterNullable: false, alterType: false });
  table
    .json("régions")
    .comment(`Liste des régions concernées par le projet`)
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("déposant")
    .comment(
      `Le déposant est la personne qui dépose le dossier sur DS. Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose le dossier. Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur. Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" (qui est différent de notre "demandeur")`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .integer("demandeur_personne_physique")
    .comment(`Si le demandeur est une personne physique, ce champ est non nul`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("demandeur_personne_morale")
    .comment(`Si le demandeur est une personne morale, ce champ est non nul`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("nom")
    .comment(`Nom de la demande de dérogation espèces protégées`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("number_demarches_simplifiées")
    .comment(`Numéro du dossier dans Démarches Simplifiées`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("historique_nom_porteur")
    .comment(`Nom du porteur de projet dans les Annotations Privées`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("historique_localisation")
    .comment(`Localisation du projet dans les Annotations Privées`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("ddep_nécessaire")
    .comment(
      `Indique si une demande de dérogation est nécessaire pour ce dossier (Oui, Non, à déterminer).`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .boolean("enjeu_politique")
    .comment(`Indique si le dossier présente un enjeu politique`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("commentaire_libre")
    .comment(`Commentaires de l'instructeur.rice sur le dossier`)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("historique_date_envoi_dernière_contribution")
    .comment(`Date d'envoi de la dernière contribution`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("historique_identifiant_demande_onagre")
    .comment(`Identifiant de la demande dans ONAGRE`)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("historique_date_saisine_csrpn")
    .comment(
      `À supprimer. Date de saisine du CSRPN (Conseil Scientifique Régional du Patrimoine Naturel)`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .date("historique_date_saisine_cnpn")
    .comment(`À supprimer. Date de saisine du CNPN (Conseil National de Protection de la Nature)`)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_avis_csrpn")
    .comment(`À supprimer. Date de l'avis officiel émis par le CSRPN`)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_avis_cnpn")
    .comment(`À supprimer. Date de l'avis officiel émis par le CNPN`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("avis_csrpn_cnpn")
    .comment(`À supprimer. Avis du CSRPN ou du CNPN`)
    .alter({ alterNullable: false, alterType: false });
  table
    .date("date_consultation_public")
    .comment(`Date de la consultation publique`)
    .alter({ alterNullable: false, alterType: false });
  table
    .boolean("enjeu_écologique")
    .comment(`Indique si le dossier présente un enjeu écologique`)
    .alter({ alterNullable: false, alterType: false });
  table
    .boolean("rattaché_au_régime_ae")
    .comment(`Indique si le dossier est rattaché au régime d'Autorisation Environnementale`)
    .alter({ alterNullable: false, alterType: false });
}
