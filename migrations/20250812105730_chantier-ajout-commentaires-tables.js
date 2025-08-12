/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.increments('id')
            .comment(`Identifiant unique auto-incrémenté du dossier`)
            .alter({ alterNullable: false, alterType: false });

        table.string('id_demarches_simplifiées')
            .comment(`Identifiant unique du dossier dans la plateforme Démarches Simplifiées`)
            .alter({ alterNullable: false, alterType: false });

        table.dateTime('date_dépôt')
            .comment(`Date de première sollicitation du groupe instructeurice par le pétitionnaire`)
            .alter({ alterNullable: false, alterType: false });

        table.string('espèces_protégées_concernées')
            .comment(`Liste des espèces protégées concernées par le dossier`)
            .alter({ alterNullable: false, alterType: false });

        table.json('départements')
            .comment(`Liste des départements concernés par le projet`)
            .alter({ alterNullable: false, alterType: false });

        table.json('communes')
            .comment(`Liste des communes concernées par le projet`)
            .alter({ alterNullable: false, alterType: false });

        table.json('régions')
            .comment(`Liste des régions concernées par le projet`)
            .alter({ alterNullable: false, alterType: false });

        // Personnes impliquées
        table.integer('déposant')
            .comment(`Le déposant est la personne qui dépose le dossier sur DS. Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose le dossier. Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur. Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" (qui est différent de notre "demandeur")`)
            .alter({ alterNullable: false, alterType: false });

        table.integer('demandeur_personne_physique')
            .comment(`Si le demandeur est une personne physique, ce champ est non nul`)
            .alter({ alterNullable: false, alterType: false });

        table.string('demandeur_personne_morale')
            .comment(`Si le demandeur est une personne morale, ce champ est non nul`)
            .alter({ alterNullable: false, alterType: false });

        table.string('nom')
            .comment(`Nom du projet`)
            .alter({ alterNullable: false, alterType: false });

        table.string('number_demarches_simplifiées')
            .comment(`Numéro du dossier dans Démarches Simplifiées`)
            .alter({ alterNullable: false, alterType: false });

        // Historique et suivi
        table.string('historique_nom_porteur')
            .comment(`Nom du porteur de projet dans les Annotations Privées`)
            .alter({ alterNullable: false, alterType: false });

        table.string('historique_localisation')
            .comment(`Localisation du projet dans les Annotations Privées`)
            .alter({ alterNullable: false, alterType: false });

        table.string('ddep_nécessaire')
            .comment(`Indique si une demande de dérogation est nécessaire pour ce dossier (Oui, Non, à déterminer).`)
            .alter({ alterNullable: false, alterType: false });

        table.boolean('enjeu_politique')
            .comment(`Indique si le dossier présente un enjeu politique`)
            .alter({ alterNullable: false, alterType: false });

        table.string('commentaire_libre')
            .comment(`Commentaires de l'instructeur.i.ce sur le dossier.`)
            .alter({ alterNullable: false, alterType: false });

        table.date('historique_date_envoi_dernière_contribution')
            .comment(`Date d'envoi de la dernière contribution`)
            .alter({ alterNullable: false, alterType: false });

        table.string('historique_identifiant_demande_onagre')
            .comment(`Identifiant de la demande dans ONAGRE`)
            .alter({ alterNullable: false, alterType: false });

        table.date('historique_date_saisine_csrpn')
            .comment(`Date de saisine du CSRPN (Conseil Scientifique Régional du Patrimoine Naturel)`)
            .alter({ alterNullable: false, alterType: false });

        table.date('historique_date_saisine_cnpn')
            .comment(`Date de saisine du CNPN (Conseil National de Protection de la Nature)`)
            .alter({ alterNullable: false, alterType: false });

        table.date('date_avis_csrpn')
            .comment(`Date de l’avis officiel émis par le CSRPN`)
            .alter({ alterNullable: false, alterType: false });

        table.date('date_avis_cnpn')
            .comment(`Date de l’avis officiel émis par le CNPN`)
            .alter({ alterNullable: false, alterType: false });

        table.string('avis_csrpn_cnpn')
            .comment(`Avis du CSRPN ou du CNPN`)
            .alter({ alterNullable: false, alterType: false });

        table.date('date_consultation_public')
            .comment(`Date de la consultation publique`)
            .alter({ alterNullable: false, alterType: false });

        table.boolean('enjeu_écologique')
            .comment(`Indique si le dossier présente un enjeu écologique`)
            .alter({ alterNullable: false, alterType: false });

        table.boolean('rattaché_au_régime_ae')
            .comment(`Indique si le dossier est rattaché au régime d'Autorisation Environnementale`)
            .alter({ alterNullable: false, alterType: false });

        table.string('prochaine_action_attendue_par')
            .comment(`Indique qui doit effectuer la prochaine action (Instructeur, CNPN/CSRPN, Consultation du public, Pétitionnaire, Autre administration...)`)
            .alter({ alterNullable: false, alterType: false });

        table.string('activité_principale')
            .comment(`Catégorie normalisée décrivant le secteur ou le type d’activité à l’origine de la demande de dérogation relative aux espèces protégées. Les valeurs possibles couvrent différents domaines (production d’énergie renouvelable, infrastructures de transport, carrières, urbanisation, gestion de l’eau, restauration écologique, etc.) et permettent de classer les dossiers selon la nature de l’intervention.`)
            .alter({ alterNullable: false, alterType: false });

        table.uuid('espèces_impactées')
            .comment(`Référence vers le fichier des espèces impactées`)
            .alter({ alterNullable: false, alterType: false });

        table.text('description')
            .comment(`Description synthétique du projet`)
            .alter({ alterNullable: false, alterType: false });

        table.date('date_début_intervention')
            .comment(`Date de début de l'intervention`)
            .alter({ alterNullable: false, alterType: false });

        table.date('date_fin_intervention')
            .comment(`Date de fin de l'intervention`)
            .alter({ alterNullable: false, alterType: false });

        table.float('durée_intervention')
            .comment(`Peut être différente de (date_fin_intervention - date_début_intervention) dans le cas des dérogations pluri-annuelles avec une petite période d'intervention annuelle`)
            .alter({ alterNullable: false, alterType: false });

        table.json('scientifique_type_demande')
            .comment(`Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Ce champ correspond à la liste des opérations envisagées dans le cadre de la demande de dérogation espèces protégées, choisies parmi des catégories prédéfinies (par ex. capture et relâcher immédiat sur place avec ou sans marquage, prélèvement de matériel biologique, autres cas spécifiques). Plusieurs types peuvent être sélectionnés pour une même demande.`)
            .alter({ alterNullable: false, alterType: false });

        table.text('scientifique_description_protocole_suivi')
            .comment(`Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Description du protocole scientifique prévu (ex. capture et relâcher immédiat avec ou sans marquage, prélèvement de matériel biologique, autres cas).`)
            .alter({ alterNullable: false, alterType: false });

        table.json('scientifique_mode_capture')
            .comment(`Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Modes de capture utilisés`)
            .alter({ alterNullable: false, alterType: false });

        table.text('scientifique_modalités_source_lumineuses')
            .comment(`null signifie qu'il n'y a pas d'utilisation de sources lumineuses`)
            .alter({ alterNullable: false, alterType: false });

        table.text('scientifique_modalités_marquage')
            .comment(`Modalités de marquage des individus`)
            .alter({ alterNullable: false, alterType: false });

        table.text('scientifique_modalités_transport')
            .comment(`Modalités de transport des individus`)
            .alter({ alterNullable: false, alterType: false });

        table.text('scientifique_périmètre_intervention')
            .comment(`Périmètre géographique de l'intervention scientifique`)
            .alter({ alterNullable: false, alterType: false });

        table.json('scientifique_intervenants')
            .comment(`Liste des intervenants scientifiques`)
            .alter({ alterNullable: false, alterType: false });

        table.text('scientifique_précisions_autres_intervenants')
            .comment(`Précisions sur les autres intervenants scientifiques`)
            .alter({ alterNullable: false, alterType: false });

        table.text('justification_absence_autre_solution_satisfaisante')
            .comment(`Article L411-2 I.4 du code de l'environnement`)
            .alter({ alterNullable: false, alterType: false });

        table.string('motif_dérogation')
            .comment(`Article L411-2 I.4 a) b) c) d) e) du code de l'environnement`)
            .alter({ alterNullable: false, alterType: false });

        table.text('justification_motif_dérogation')
            .comment(`Justification du motif de dérogation`)
            .alter({ alterNullable: false, alterType: false });

        table.boolean('mesures_erc_prévues')
            .comment(`Indique si des mesures ERC (Éviter, Réduire, Compenser) sont prévues`)
            .alter({ alterNullable: false, alterType: false });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        // Suppression de tous les commentaires ajoutés
        table.increments('id').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('id_demarches_simplifiées').comment(``).alter({ alterNullable: false, alterType: false });
        table.dateTime('date_dépôt').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('espèces_protégées_concernées').comment(``).alter({ alterNullable: false, alterType: false });
        table.json('départements').comment(``).alter({ alterNullable: false, alterType: false });
        table.json('communes').comment(``).alter({ alterNullable: false, alterType: false });
        table.json('régions').comment(``).alter({ alterNullable: false, alterType: false });
        table.integer('déposant').comment(``).alter({ alterNullable: false, alterType: false });
        table.integer('demandeur_personne_physique').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('demandeur_personne_morale', 14).comment(``).alter({ alterNullable: false, alterType: false });
        table.string('nom').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('number_demarches_simplifiées').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('historique_nom_porteur').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('historique_localisation').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('ddep_nécessaire').comment(``).alter({ alterNullable: false, alterType: false });
        table.boolean('enjeu_politique').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('commentaire_libre').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('historique_date_envoi_dernière_contribution').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('historique_identifiant_demande_onagre').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('historique_date_saisine_csrpn').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('historique_date_saisine_cnpn').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('date_avis_csrpn').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('date_avis_cnpn').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('avis_csrpn_cnpn').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('date_consultation_public').comment(``).alter({ alterNullable: false, alterType: false });
        table.boolean('enjeu_écologique').comment(``).alter({ alterNullable: false, alterType: false });
        table.boolean('rattaché_au_régime_ae').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('prochaine_action_attendue_par').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('activité_principale').comment(``).alter({ alterNullable: false, alterType: false });
        table.uuid('espèces_impactées').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('description').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('date_début_intervention').comment(``).alter({ alterNullable: false, alterType: false });
        table.date('date_fin_intervention').comment(``).alter({ alterNullable: false, alterType: false });
        table.float('durée_intervention').comment(``).alter({ alterNullable: false, alterType: false });
        table.json('scientifique_type_demande').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('scientifique_description_protocole_suivi').comment(``).alter({ alterNullable: false, alterType: false });
        table.json('scientifique_mode_capture').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('scientifique_modalités_source_lumineuses').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('scientifique_modalités_marquage').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('scientifique_modalités_transport').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('scientifique_périmètre_intervention').comment(``).alter({ alterNullable: false, alterType: false });
        table.json('scientifique_intervenants').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('scientifique_précisions_autres_intervenants').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('justification_absence_autre_solution_satisfaisante').comment(``).alter({ alterNullable: false, alterType: false });
        table.string('motif_dérogation').comment(``).alter({ alterNullable: false, alterType: false });
        table.text('justification_motif_dérogation').comment(``).alter({ alterNullable: false, alterType: false });
        table.boolean('mesures_erc_prévues').comment(``).alter({ alterNullable: false, alterType: false });
    });
};
