export const COLUMN_COMMENTS_CHUNK_2 = {
  dossier: {
    demarche_numerique_id: [
      "Identifiant unique du dossier dans la plateforme Démarches Simplifiées. Utile uniquement pour certaines mutations de l'API GraphQL. Utiliser plutôt le number_demarches_simplifiées",
      "Unique dossier identifier on Démarches Simplifiées. Used only for some GraphQL API mutations. Prefer demarche_numerique_number",
    ],
    depot_date: [
      "Date à laquelle la demande de dérogation Espèce Protégée a été reçue par les instructeur.i.ces.",
      "Date on which the protected espece derogation request was received by the instructeurs.",
    ],
    departments: [
      "Liste des départements concernés par le projet",
      "List of departments covered by the project",
    ],
    communes: [
      "Liste des communes concernées par le projet",
      "List of municipalities covered by the project",
    ],
    deposant: [
      `Le déposant est la personne qui dépose le dossier sur DS. Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose le dossier. Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur. Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" (qui est différent de notre "demandeur")`,
      `The deposant is the personne who submits the dossier on DS. In some situations, this personne differs from the demandeur (the personne morale or personne physique requesting the derogation), for example when a consulting firm authorized by a personne morale submits the dossier. The deposant is not necessarily the demandeur's internal representative (main point of contact). In DS terminology, what we call "déposant" is stored in the "demandeur" property (which differs from our "demandeur")`,
    ],
    demandeur_personne_physique: [
      "Si le demandeur est une personne physique, ce champ est non nul",
      "If the demandeur is a personne physique, this field is not null",
    ],
    demandeur_personne_morale: [
      "Si le demandeur est une personne morale, ce champ est non nul",
      "If the demandeur is a personne morale, this field is not null",
    ],
    regions: [
      "Liste des régions concernées par le projet",
      "List of regions covered by the project",
    ],
    name: [
      "Nom de la demande de dérogation espèces protégées",
      "Name of the protected espece derogation request",
    ],
    demarche_numerique_number: [
      "Numéro du dossier dans Démarches Simplifiées",
      "Dossier number in Démarches Simplifiées",
    ],
    ddep_required: [
      "Indique si une demande de dérogation est nécessaire pour ce dossier.",
      "Indicates whether a derogation request is required for this dossier.",
    ],
    free_comment: [
      "Commentaires de l'instructeur.rice sur le dossier",
      "Comments from the instructeur about the dossier",
    ],
    onagre_demande_identifier: [
      "Identifiant de la demande dans ONAGRE",
      "Demande identifier in ONAGRE",
    ],
    public_consultation_start_date: [
      "Date de la consultation publique",
      "Public consultation date",
    ],
    linked_to_ae_regime: [
      "Indique si le dossier est rattaché au régime d'Autorisation Environnementale",
      "Indicates whether the dossier is linked to the Autorisation Environnementale regime",
    ],
    next_action_expected_from: [
      "Indique qui doit effectuer la prochaine action (Instructeur, CNPN/CSRPN, Consultation du public, Pétitionnaire, Autre administration...)",
      'Indicates who must take the next action ("Instructeur", "CNPN/CSRPN", "Consultation du public", "Pétitionnaire", "Autre administration")',
    ],
    main_activite: [
      "Catégorie normalisée décrivant le secteur ou le type d'activité à l'origine de la demande de dérogation relative aux espèces protégées. Les valeurs possibles couvrent différents domaines (production d'énergie renouvelable, infrastructures de transport, carrières, urbanisation, gestion de l'eau, restauration écologique, etc.) et permettent de classer les dossiers selon la nature de l'intervention.",
      "Standardized category describing the sector or activity behind the protected espece derogation request. Possible values cover different fields (renewable energy production, transport infrastructure, quarries, urban development, water management, ecological restoration, etc.) and classify dossiers by the nature of the work.",
    ],
    especes_impactees: [
      "Référence vers le fichier des espèces impactées",
      "Reference to the fichier containing the impacted especes",
    ],
    description: ["Description synthétique du projet", "Summary description of the project"],
    intervention_start_date: ["Date de début de l'intervention", "Intervention start date"],
    intervention_end_date: ["Date de fin de l'intervention", "Intervention end date"],
    intervention_duration: [
      "Peut être différente de (date_fin_intervention - date_début_intervention) dans le cas des dérogations pluri-annuelles avec une petite période d'intervention annuelle",
      "May differ from (intervention_end_date - intervention_start_date) for multi-year derogations with a short annual intervention period",
    ],
    scientifique_demande_type: [
      "Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Ce champ correspond à la liste des opérations envisagées dans le cadre de la demande de dérogation espèces protégées, choisies parmi des catégories prédéfinies (par ex. capture et relâcher immédiat sur place avec ou sans marquage, prélèvement de matériel biologique, autres cas spécifiques). Plusieurs types peuvent être sélectionnés pour une même demande.",
      "For a dossier whose main activity is scientific research. This field contains the operations planned under the protected espece derogation request, selected from predefined categories (e.g. immediate on-site capture and release with or without marking, biological material sampling, and other specific cases). Several types can be selected for one request.",
    ],
    scientifique_suivi_protocol_description: [
      "Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Description du protocole scientifique prévu (ex. capture et relâcher immédiat avec ou sans marquage, prélèvement de matériel biologique, autres cas).",
      "For a dossier whose main activity is scientific research. Description of the planned scientific protocol (e.g. immediate capture and release with or without marking, biological material sampling, and other cases).",
    ],
    scientifique_capture_mode: [
      "Dans le contexte d'un dossier dont l'activité principale est la recherche scientifique. Modes de capture utilisés",
      "For a dossier whose main activity is scientific research. Capture methods used",
    ],
    scientifique_light_source_conditions: [
      "null signifie qu'il n'y a pas d'utilisation de sources lumineuses",
      "null means that no light sources are used",
    ],
    scientifique_marking_conditions: [
      "Modalités de marquage des individus",
      "Conditions for marking individus",
    ],
    scientifique_transport_conditions: [
      "Modalités de transport des individus",
      "Conditions for transporting individus",
    ],
    scientifique_intervention_perimeter: [
      "Périmètre géographique de l'intervention scientifique",
      "Geographic perimeter of the scientific intervention",
    ],
    scientifique_intervenants: [
      "Liste des intervenants scientifiques",
      "List of scientific intervenants",
    ],
    scientifique_other_intervenants_details: [
      "Précisions sur les autres intervenants scientifiques",
      "Details about the other scientific intervenants",
    ],
    no_other_satisfactory_solution_justification: [
      "Article L411-2 I.4 du code de l'environnement",
      "Article L411-2 I.4 of the French Environmental Code",
    ],
    motif_derogation: [
      "Article L411-2 I.4 a) b) c) d) e) du code de l'environnement",
      "Article L411-2 I.4 a) b) c) d) e) of the French Environmental Code",
    ],
    motif_derogation_justification: [
      "Justification du motif de dérogation",
      "Justification for the derogation motif",
    ],
    mesures_erc_planned: [
      "Appréciation du pétitionnaire. Indique si des mesures ERC (Éviter, Réduire, Compenser) sont prévues",
      "Assessment by the petitionnaire. Indicates whether ERC mesures (Avoid, Reduce, Compensate) are planned",
    ],
    scientifique_previous_assessment: [
      'Réponse à la question "Cette demande concerne un programme de suivi déjà existant"',
      'Answer to the question "Cette demande concerne un programme de suivi déjà existant"',
    ],
    scientifique_demande_purposes: [
      'Réponse à la question "Captures/Relâchers/Prélèvement - Finalité(s) de la demande"',
      'Answer to the question "Captures/Relâchers/Prélèvement - Finalité(s) de la demande"',
    ],
    dossier_oiseau_simple_destroyed_nids_count: [
      `Réponse à la question "Nombre de nids d'Hirondelles détruits"`,
      `Answer to the question "Nombre de nids d'Hirondelles détruits"`,
    ],
    dossier_oiseau_simple_compensated_nids_count: [
      `Réponse à la question "Indiquer le nombre de nids artificiels posés en compensation". Concerne les dossiers spécifiques à des oiseaux, comme les hirondelles ou les cigognes.`,
      `Answer to the question "Indiquer le nombre de nids artificiels posés en compensation". Applies to dossiers specific to birds such as swallows or storks.`,
    ],
    type: [
      "Type du dossier. Les instructeurices ont des typologies de dossiers qui reviennent souvent, comme les dossiers Hirondelles, les dossiers Cigognes...",
      'Dossier type. Instructeurs often encounter recurring dossier categories such as "Hirondelle" dossiers and "Cigogne" dossiers.',
    ],
    ecological_inventory_completed: [
      'Réponse à la question : "Avez-vous réalisé un état des lieux écologique complet $1"',
      'Answer to the question: "Avez-vous réalisé un état des lieux écologique complet $1"',
    ],
    especes_present_in_influence_area: [
      `Réponse à la question : "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet $1"`,
      `Answer to the question: "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet $1"`,
    ],
    risk_despite_erc_mesures: [
      `Réponse à la question : "Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il $1"`,
      `Answer to the question: "Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il $1"`,
    ],
    public_consultation_end_date: [
      'Valeur pour le champ : "Date de fin de la consultation du public ou enquête publique"',
      'Value for the field: "Date de fin de la consultation du public ou enquête publique"',
    ],
    er_mesures_sufficient: [
      "Appréciation de l'instructrice. Indique si les mesures d'évitement et de réduction (ER) sont suffisantes pour éviter une demande de dérogation. Ce champ est lié au champ ddep_nécessaire.",
      "Assessment by the instructeur. Indicates whether avoidance and reduction (ER) mesures are sufficient to avoid a derogation request. This field is linked to ddep_required.",
    ],
    enjeu: [
      "Indique si le dossier présente un enjeu (écologique, politique...).",
      "Indicates whether the dossier has an enjeu (ecological, political...).",
    ],
    commissioning_date: [
      "Date de début d'exploitation (mise en service de l'exploitation)",
      "Start date of operations (commissioning of operations)",
    ],
  },
} as const;
