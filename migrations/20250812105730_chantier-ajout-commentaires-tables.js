/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('dossier', (table) => {

        table.string('id_demarches_simplifiées')
            .comment(`Identifiant unique du dossier dans la plateforme Démarches Simplifiées`)
            .alter({ alterNullable: false, alterType: false });

        table.dateTime('date_dépôt')
            .comment(`Date à laquelle la demande de dérogation Espèce Protégée a été reçue par les instructeur.i.ces.`)
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
            .comment(`Date de l'avis officiel émis par le CSRPN`)
            .alter({ alterNullable: false, alterType: false });

        table.date('date_avis_cnpn')
            .comment(`Date de l'avis officiel émis par le CNPN`)
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
            .comment(`Catégorie normalisée décrivant le secteur ou le type d'activité à l'origine de la demande de dérogation relative aux espèces protégées. Les valeurs possibles couvrent différents domaines (production d'énergie renouvelable, infrastructures de transport, carrières, urbanisation, gestion de l'eau, restauration écologique, etc.) et permettent de classer les dossiers selon la nature de l'intervention.`)
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
    }).then(() => {
        // Ajout des commentaires pour la table contrôle
        return knex.schema.alterTable('contrôle', (table) => {

            table.uuid('prescription')
                .comment(`Référence vers la prescription associée à ce contrôle. Une prescription peut avoir plusieurs contrôles pour assurer le suivi de sa mise en œuvre.`)
                .alter({ alterNullable: false, alterType: false });

            table.datetime('date_contrôle')
                .comment(`Date et heure précise à laquelle le contrôle a été effectué. Permet de tracer la chronologie des vérifications et de planifier les contrôles futurs.`)
                .alter({ alterNullable: false, alterType: false });

            table.string('résultat')
                .comment(`Résultat du contrôle effectué. Pour le moment, c'est une chaîne libre. À terme, les valeurs pourront être standardisées (ex: Conforme, Non conforme, Conforme avec réserves, etc.) pour faciliter l'analyse et le reporting.`)
                .alter({ alterNullable: false, alterType: false });

            table.text('commentaire')
                .comment(`Commentaires détaillés de l'inspecteur sur le contrôle effectué. Peut inclure des observations sur l'état de mise en œuvre, des difficultés rencontrées, des recommandations, etc.`)
                .alter({ alterNullable: false, alterType: false });

            table.string('type_action_suite_contrôle')
                .comment(`Type d'action à entreprendre suite au contrôle. Pour le moment, c'est une chaîne libre. Exemples : contrôle terrain, mail à envoyer au porteur de projet...`)
                .alter({ alterNullable: false, alterType: false });

            table.date('date_action_suite_contrôle')
                .comment(`Date à laquelle l'action suite au contrôle a été effectuée. Permet de tracer le délai entre le contrôle et la mise en œuvre des mesures correctives ou coercitives.`)
                .alter({ alterNullable: false, alterType: false });

            table.date('date_prochaine_échéance')
                .comment(`Date de la prochaine échéance de contrôle programmée. Permet de planifier le suivi et de s'assurer que les contrôles sont effectués selon la fréquence prévue dans la prescription.`)
                .alter({ alterNullable: false, alterType: false });
        });
    }).then(() => {
        // Ajout des commentaires pour la table personne
        return knex.schema.alterTable('personne', (table) => {

            table.string('nom')
                .comment(`Nom de famille de la personne. Permet d'identifier formellement l'individu dans le système.`)
                .alter({ alterNullable: false, alterType: false });

            table.string('prénoms')
                .comment(`Prénoms de la personne. Complète l'identification de l'individu avec le nom de famille.`)
                .alter({ alterNullable: false, alterType: false });

            table.string('email')
                .comment(`Adresse email de la personne. Utilisée pour la communication, l'authentification et l'identification unique de l'utilisateur dans le système.`)
                .alter({ alterNullable: false, alterType: false });

            table.string('code_accès')
                .comment(`Code d'accès unique de la personne. Permet l'authentification et l'identification de l'utilisateur lors de la connexion au système.`)
                .alter({ alterNullable: false, alterType: false });
        });
    }).then(() => {
        // Ajout des commentaires pour la table décision_administrative
        return knex.schema.alterTable('décision_administrative', (table) => {

            table.integer('dossier')
                .comment(`Référence vers le dossier associé à cette décision administrative. Un dossier peut avoir plusieurs décisions administratives au cours de son instruction (ex: arrêté préfectoral, arrêté ministériel, etc.).`)
                .alter({ alterNullable: false, alterType: false });

            table.string('numéro')
                .comment(`Numéro officiel de la décision administrative. Ce numéro est généralement attribué par l'administration et permet d'identifier formellement la décision dans les systèmes administratifs.`)
                .alter({ alterNullable: false, alterType: false });

            table.string('type')
                .comment(`Type de décision administrative. Peut être par exemple : Arrêté refus, Arrêté modification, Arrêté dérogation, Autre décision...`)
                .alter({ alterNullable: false, alterType: false });

            table.date('date_signature')
                .comment(`Date de signature de la décision administrative par l'autorité compétente. Cette date marque l'entrée en vigueur de la décision et le début des obligations pour le bénéficiaire.`)
                .alter({ alterNullable: false, alterType: false });

            table.date('date_fin_obligations')
                .comment(`Date de fin des obligations imposées par la décision administrative. Cette date marque la fin de la période de validité de la décision et des prescriptions associées.`)
                .alter({ alterNullable: false, alterType: false });

            table.uuid('fichier')
                .comment(`Référence vers le fichier contenant la décision administrative.`)
                .alter({ alterNullable: false, alterType: false });
        });
    }).then(() => {
        // Ajout des commentaires pour la table prescription
        return knex.schema.alterTable('prescription', (table) => {

            table.uuid('décision_administrative')
                .comment(`Référence vers la décision administrative associée à cette prescription. Une décision administrative peut contenir plusieurs prescriptions détaillant les obligations spécifiques à respecter.`)
                .alter({ alterNullable: false, alterType: false });

            table.date('date_échéance')
                .comment(`Date limite à laquelle la prescription doit être respectée. Les contrôles de cette prescription s'effectuent dès lors que la date d'échéance est dépassée.`)
                .alter({ alterNullable: false, alterType: false });

            table.string('numéro_article')
                .comment(`Numéro de l'article de la prescription. Permet d'identifier et de référencer précisément la prescription dans le cadre de la décision administrative.`)
                .alter({ alterNullable: false, alterType: false });

            table.text('description')
                .comment(`Description détaillée de la prescription. Explique précisément ce qui doit être fait, comment et dans quelles conditions pour respecter l'obligation imposée.`)
                .alter({ alterNullable: false, alterType: false });

            table.integer('surface_évitée')
                .comment(`Surface en m² qui a été évitée grâce aux mesures de protection mises en place.`)
                .alter({ alterNullable: false, alterType: false });

            table.integer('surface_compensée')
                .comment(`Surface en m² qui a été compensée pour atténuer les impacts du projet.`)
                .alter({ alterNullable: false, alterType: false });

            table.integer('nids_évités')
                .comment(`Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été évités grâce aux mesures de protection mises en place.`)
                .alter({ alterNullable: false, alterType: false });

            table.integer('nids_compensés')
                .comment(`Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été compensés pour atténuer les impacts du projet.`)
                .alter({ alterNullable: false, alterType: false });

            table.integer('individus_évités')
                .comment(`Nombre d'individus qui ont été évités grâce aux mesures de protection mises en place.`)
                .alter({ alterNullable: false, alterType: false });

            table.integer('individus_compensés')
                .comment(`Nombre d'individus qui ont été compensés pour atténuer les impacts du projet.`)
                .alter({ alterNullable: false, alterType: false });
        });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        // Suppression de tous les commentaires ajoutés
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
    }).then(() => {
        // Suppression des commentaires ajoutés pour la table contrôle
        return knex.schema.alterTable('contrôle', (table) => {
            table.uuid('prescription').comment(``).alter({ alterNullable: false, alterType: false });
            table.datetime('date_contrôle').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('résultat').comment(``).alter({ alterNullable: false, alterType: false });
            table.text('commentaire').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('type_action_suite_contrôle').comment(``).alter({ alterNullable: false, alterType: false });
            table.date('date_action_suite_contrôle').comment(``).alter({ alterNullable: false, alterType: false });
            table.date('date_prochaine_échéance').comment(``).alter({ alterNullable: false, alterType: false });
        });
    }).then(() => {
        // Suppression des commentaires ajoutés pour la table personne
        return knex.schema.alterTable('personne', (table) => {
            table.string('nom').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('prénoms').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('email').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('code_accès').comment(``).alter({ alterNullable: false, alterType: false });
        });
    }).then(() => {
        // Suppression des commentaires ajoutés pour la table décision_administrative
        return knex.schema.alterTable('décision_administrative', (table) => {
            table.integer('dossier').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('numéro').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('type').comment(``).alter({ alterNullable: false, alterType: false });
            table.date('date_signature').comment(``).alter({ alterNullable: false, alterType: false });
            table.date('date_fin_obligations').comment(``).alter({ alterNullable: false, alterType: false });
            table.uuid('fichier').comment(``).alter({ alterNullable: false, alterType: false });
        });
    }).then(() => {
        // Suppression des commentaires ajoutés pour la table prescription
        return knex.schema.alterTable('prescription', (table) => {
            table.uuid('décision_administrative').comment(``).alter({ alterNullable: false, alterType: false });
            table.date('date_échéance').comment(``).alter({ alterNullable: false, alterType: false });
            table.string('numéro_article').comment(``).alter({ alterNullable: false, alterType: false });
            table.text('description').comment(``).alter({ alterNullable: false, alterType: false });
            table.integer('surface_évitée').comment(``).alter({ alterNullable: false, alterType: false });
            table.integer('surface_compensée').comment(``).alter({ alterNullable: false, alterType: false });
            table.integer('nids_évités').comment(``).alter({ alterNullable: false, alterType: false });
            table.integer('nids_compensés').comment(``).alter({ alterNullable: false, alterType: false });
            table.integer('individus_évités').comment(``).alter({ alterNullable: false, alterType: false });
            table.integer('individus_compensés').comment(``).alter({ alterNullable: false, alterType: false });
        });
    });
};
