import type { Knex } from "knex";

const tableRenames = [
  ["arête_personne__cap_écriture_annotation", "edge_personne__cap_annotation_write"],
  ["arête_cap_dossier__groupe_instructeurs", "edge_cap_dossier__groupe_instructeurs"],
  ["arête_groupe_instructeurs__dossier", "edge_groupe_instructeurs__dossier"],
  ["arête_personne_suit_dossier", "edge_personne_follows_dossier"],
  [
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    "edge_dossier__fichier_pieces_jointes_petitionnaire",
  ],
  ["cap_écriture_annotation", "cap_annotation_write"],
  ["cap_évènement_métrique", "cap_evenement_metrique"],
  ["évènement_métrique", "evenement_metrique"],
  ["évènement_phase_dossier", "evenement_phase_dossier"],
  ["décision_administrative", "decision_administrative"],
  ["contrôle", "controle"],
  ["résultat_synchronisation_DS_88444", "demarche_numerique_88444_synchronization_result"],
  ["attachment_autre", "other_attachment"],
  ["capability-geomce", "capability_geomce"],
] as const;

const columnRenames = {
  dossier: [
    ["id_demarches_simplifiées", "demarche_numerique_id"],
    ["date_dépôt", "depot_date"],
    ["départements", "departments"],
    ["déposant", "deposant"],
    ["régions", "regions"],
    ["nom", "name"],
    ["number_demarches_simplifiées", "demarche_numerique_number"],
    ["ddep_nécessaire", "ddep_required"],
    ["commentaire_libre", "free_comment"],
    ["historique_identifiant_demande_onagre", "onagre_demande_identifier"],
    ["date_debut_consultation_public", "public_consultation_start_date"],
    ["rattaché_au_régime_ae", "linked_to_ae_regime"],
    ["prochaine_action_attendue_par", "next_action_expected_from"],
    ["activité_principale", "main_activite"],
    ["espèces_impactées", "especes_impactees"],
    ["date_début_intervention", "intervention_start_date"],
    ["date_fin_intervention", "intervention_end_date"],
    ["durée_intervention", "intervention_duration"],
    ["scientifique_type_demande", "scientifique_demande_type"],
    ["scientifique_description_protocole_suivi", "scientifique_suivi_protocol_description"],
    ["scientifique_mode_capture", "scientifique_capture_mode"],
    ["scientifique_modalités_source_lumineuses", "scientifique_light_source_conditions"],
    ["scientifique_modalités_marquage", "scientifique_marking_conditions"],
    ["scientifique_modalités_transport", "scientifique_transport_conditions"],
    ["scientifique_périmètre_intervention", "scientifique_intervention_perimeter"],
    ["scientifique_précisions_autres_intervenants", "scientifique_other_intervenants_details"],
    [
      "justification_absence_autre_solution_satisfaisante",
      "no_other_satisfactory_solution_justification",
    ],
    ["motif_dérogation", "motif_derogation"],
    ["justification_motif_dérogation", "motif_derogation_justification"],
    ["mesures_erc_prévues", "mesures_erc_planned"],
    ["scientifique_bilan_antérieur", "scientifique_previous_assessment"],
    ["scientifique_finalité_demande", "scientifique_demande_purposes"],
    ["nombre_nids_détruits_dossier_oiseau_simple", "dossier_oiseau_simple_destroyed_nids_count"],
    ["nombre_nids_compensés_dossier_oiseau_simple", "dossier_oiseau_simple_compensated_nids_count"],
    ["numéro_démarche", "demarche_number"],
    ["etat_des_lieux_ecologique_complet_realise", "ecological_inventory_completed"],
    ["presence_especes_dans_aire_influence", "especes_present_in_influence_area"],
    ["risque_malgre_mesures_erc", "risk_despite_erc_mesures"],
    ["date_fin_consultation_public", "public_consultation_end_date"],
    ["mesures_er_suffisantes", "er_mesures_sufficient"],
    ["date_mise_en_service", "commissioning_date"],
    ["cartographie_projet", "projet_map"],
  ],
  personne: [
    ["nom", "last_name"],
    ["prénoms", "first_names"],
    ["code_accès", "access_code"],
  ],
  entreprise: [
    ["raison_sociale", "legal_name"],
    ["adresse", "address"],
  ],
  groupe_instructeurs: [
    ["nom", "name"],
    ["numéro_démarche", "demarche_number"],
  ],
  decision_administrative: [
    ["numéro", "number"],
    ["date_signature", "signature_date"],
    ["date_fin_obligations", "obligations_end_date"],
  ],
  prescription: [
    ["décision_administrative", "decision_administrative"],
    ["date_échéance", "due_date"],
    ["numéro_article", "article_number"],
    ["surface_évitée", "avoided_surface"],
    ["surface_compensée", "compensated_surface"],
    ["nids_évités", "avoided_nids"],
    ["nids_compensés", "compensated_nids"],
    ["individus_évités", "avoided_individus"],
    ["individus_compensés", "compensated_individus"],
  ],
  controle: [
    ["date_contrôle", "controle_date"],
    ["résultat", "result"],
    ["commentaire", "comment"],
    ["type_action_suite_contrôle", "post_controle_action_type"],
    ["date_action_suite_contrôle", "post_controle_action_date"],
    ["date_prochaine_échéance", "next_due_date"],
  ],
  avis_expert: [
    ["date_saisine", "saisine_date"],
    ["date_avis", "avis_date"],
  ],
  message: [
    ["contenu", "content"],
    ["email_expéditeur", "sender_email"],
    ["id_démarches_simplifiées", "demarche_numerique_id"],
  ],
  notification: [
    ["date_dernière_mise_à_jour", "updated_at"],
    ["vue", "viewed"],
  ],
  demarche_numerique_88444_synchronization_result: [
    ["succès", "success"],
    ["horodatage", "timestamp"],
    ["erreur", "error"],
  ],
  evenement_phase_dossier: [
    ["horodatage", "timestamp"],
    ["cause_personne", "caused_by_personne"],
    ["DS_emailAgentTraitant", "demarche_numerique_agent_email"],
    ["DS_motivation", "demarche_numerique_motivation"],
  ],
  evenement_metrique: [
    ["évènement", "evenement"],
    ["détails", "details"],
  ],
  edge_personne__cap_annotation_write: [["écriture_annotation_cap", "annotation_write_cap"]],
  file: [
    ["nom", "name"],
    ["taille", "size"],
    ["DS_checksum", "demarche_numerique_checksum"],
    ["DS_createdAt", "demarche_numerique_created_at"],
  ],
  espece_protegee_modification: [
    ["exclu", "excluded"],
    ["modifie_par", "modified_by"],
  ],
} as const;

// Each pair is [original French comment, English comment], keyed by the renamed schema.
const columnComments = {
  avis_expert: {
    expert: [
      "Instance consultée pour avis sur la dérogation (ex. : CSRPN, CNPN, autre autorité compétente).",
      "Authority consulted for an avis on the derogation (e.g. CSRPN, CNPN, or another competent authority).",
    ],
    saisine_date: [
      "Date à laquelle l'expert a été officiellement saisi pour avis.",
      "Date on which the expert was officially consulted for an avis.",
    ],
    saisine_fichier: [
      "Fichier transmis lors de la saisine de l'expert.",
      "Fichier sent when the expert was consulted.",
    ],
    avis: [
      "Nature de l'avis émis par l'expert (ex. : Favorable, Favorable sous conditions, Défavorable, Non renseigné).",
      'Nature of the avis issued by the expert (e.g. "Favorable", "Favorable sous conditions", "Défavorable", "Non renseigné").',
    ],
    avis_date: [
      "Date de formulation ou de réception de l'avis de l'expert.",
      "Date on which the expert's avis was issued or received.",
    ],
    avis_fichier: [
      "Fichier contenant l'avis formel de l'expert.",
      "Fichier containing the expert's formal avis.",
    ],
  },
  cap_annotation_write: {
    instructeur_id: [
      "Identifiant de l'instructeur.rice dans Démarches Simplifiées. Utile pour faire référence à l'instructeur.rice dans les appels API",
      "Démarches Simplifiées identifier of the instructeur. Used to refer to the instructeur in API calls",
    ],
  },
  capability_geomce: {
    secret: [
      "Cette table n'a qu'une seule ligne, une seule valeur",
      "This table has only one row and one value",
    ],
  },
  controle: {
    prescription: [
      "Référence vers la prescription associée à ce contrôle. Une prescription peut avoir plusieurs contrôles pour assurer le suivi de sa mise en œuvre.",
      "Reference to the prescription associated with this controle. A prescription can have several controles to track its implementation.",
    ],
    controle_date: [
      "Date et heure précise à laquelle le contrôle a été effectué. Permet de tracer la chronologie des vérifications et de planifier les contrôles futurs.",
      "Exact date and time when the controle was performed. Used to track the timeline of checks and schedule future controles.",
    ],
    result: [
      "Résultat du contrôle effectué. Pour le moment, c'est une chaîne libre. À terme, les valeurs pourront être standardisées (ex: Conforme, Non conforme, Conforme avec réserves, etc.) pour faciliter l'analyse et le reporting.",
      'Result of the controle. It is currently free text. Eventually, values may be standardized (e.g. "Conforme", "Non conforme", "Conforme avec réserves") to facilitate analysis and reporting.',
    ],
    comment: [
      "Commentaires détaillés de l'inspecteur sur le contrôle effectué. Peut inclure des observations sur l'état de mise en œuvre, des difficultés rencontrées, des recommandations, etc.",
      "Detailed inspector comments about the controle. May include observations about implementation status, difficulties encountered, recommendations, etc.",
    ],
    post_controle_action_type: [
      "Type d'action à entreprendre suite au contrôle. Pour le moment, c'est une chaîne libre. Exemples : email, courrier, etc.",
      "Type of action to take following the controle. It is currently free text. Examples: email, letter, etc.",
    ],
    post_controle_action_date: [
      "Date à laquelle l'action suite au contrôle a été effectuée. Elle est souvent égale à la date_contrôle, mais peut être différente si l'instructeur.rice ne fait pas les suites dans la foulée du contrôle",
      "Date on which the action following the controle was taken. It is often equal to controle_date, but may differ if the instructeur does not follow up immediately after the controle",
    ],
    next_due_date: [
      "Date de la prochaine échéance de contrôle programmée. Permet de planifier le suivi de la prescription et de prévoir un autre contrôle.",
      "Date of the next scheduled controle deadline. Used to plan prescription monitoring and another controle.",
    ],
  },
  decision_administrative: {
    dossier: [
      "Référence vers le dossier associé à cette décision administrative. Un dossier peut avoir plusieurs décisions administratives au cours de son instruction (ex: arrêté préfectoral, arrêté ministériel, etc.).",
      'Reference to the dossier associated with this decision administrative. A dossier can have several decisions administratives during its review (e.g. "arrêté préfectoral", "arrêté ministériel").',
    ],
    number: [
      "Numéro officiel de la décision administrative. Ce numéro est généralement attribué par l'administration et permet d'identifier formellement la décision dans les systèmes administratifs.",
      "Official number of the decision administrative. This number is generally assigned by the administration and formally identifies the decision in administrative systems.",
    ],
    type: [
      "Type de décision administrative. Peut être par exemple : Arrêté refus, Arrêté modification, Arrêté dérogation, Autre décision...",
      'Type of decision administrative. Examples include: "Arrêté refus", "Arrêté modification", "Arrêté dérogation", "Autre décision".',
    ],
    signature_date: [
      "Date de signature de la décision administrative par l'autorité compétente. Cette date marque l'entrée en vigueur de la décision et le début des obligations pour le bénéficiaire.",
      "Date on which the decision administrative was signed by the competent authority. This date marks the decision taking effect and the start of the beneficiary's obligations.",
    ],
    obligations_end_date: [
      "Date de fin des obligations imposées par la décision administrative. Cette date marque la fin de la période de validité de la décision et des prescriptions associées.",
      "End date of the obligations imposed by the decision administrative. This date marks the end of the decision's validity period and its associated prescriptions.",
    ],
    fichier: [
      "Référence vers le fichier contenant la décision administrative.",
      "Reference to the fichier containing the decision administrative.",
    ],
  },
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
  evenement_metrique: {
    date: ["Date de l’évènement", "Evenement date"],
    evenement: ["Type de l’évènement", "Evenement type"],
    details: [
      "Données structurées liées donnant des détails sur l’évènement",
      "Related structured data providing details about the evenement",
    ],
  },
  notification: {
    updated_at: [
      "Date à laquelle la notification a été mise à jour pour la dernière fois",
      "Date on which the notification was last updated",
    ],
    viewed: [
      "Indique si la personne a consulté ou non la notification",
      "Indicates whether the personne has viewed the notification",
    ],
  },
  personne: {
    last_name: [
      "Nom de famille de la personne. Identité civile",
      "Personne last name. Civil identity",
    ],
    first_names: [
      "Prénoms de la personne. Identité civile",
      "Personne first names. Civil identity",
    ],
    email: [
      "Adresse email de la personne. Utilisée pour la communication, l'authentification et l'identification unique de l'utilisateur dans le système.",
      "Personne email address. Used for communication, authentication, and unique user identification in the system.",
    ],
    access_code: [
      "Code d'accès unique de la personne. Permet de récupérer un lot de capabilities dans la table, notamment dans la table arête_cap_dossier__groupe_nstructeur",
      "Unique access code of the personne. Used to retrieve a set of capabilities, particularly from the edge_cap_dossier__groupe_instructeurs table",
    ],
  },
  prescription: {
    decision_administrative: [
      "Référence vers la décision administrative associée à cette prescription. Une décision administrative peut contenir plusieurs prescriptions détaillant les obligations spécifiques à respecter.",
      "Reference to the decision administrative associated with this prescription. A decision administrative can contain several prescriptions detailing the specific obligations to fulfill.",
    ],
    due_date: [
      "Date limite à laquelle la prescription doit être respectée. Les contrôles de cette prescription s'effectuent dès lors que la date d'échéance est dépassée.",
      "Deadline by which the prescription must be fulfilled. Controles of this prescription are performed once the due date has passed.",
    ],
    article_number: [
      "Numéro de l'article de la prescription. Permet d'identifier et de référencer précisément la prescription dans le cadre de la décision administrative.",
      "Article number of the prescription. Used to identify and precisely reference the prescription within the decision administrative.",
    ],
    description: [
      "Description détaillée de la prescription. Explique précisément ce qui doit être fait, comment et dans quelles conditions pour respecter l'obligation imposée.",
      "Detailed description of the prescription. Explains precisely what must be done, how, and under what conditions to fulfill the imposed obligation.",
    ],
    avoided_surface: [
      "Surface en m² qui a été évitée grâce aux mesures de protection mises en place.",
      "Surface area in m² avoided through the implemented protection mesures.",
    ],
    compensated_surface: [
      "Surface en m² qui a été compensée pour atténuer les impacts du projet.",
      "Surface area in m² compensated to mitigate the project's impacts.",
    ],
    avoided_nids: [
      "Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été évités grâce aux mesures de protection mises en place.",
      "For a dossier impacting a bird espece. Number of nests avoided through the implemented protection mesures.",
    ],
    compensated_nids: [
      "Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été compensés pour atténuer les impacts du projet.",
      "For a dossier impacting a bird espece. Number of nests compensated to mitigate the project's impacts.",
    ],
    avoided_individus: [
      "Nombre d'individus qui ont été évités grâce aux mesures de protection mises en place.",
      "Number of individus avoided through the implemented protection mesures.",
    ],
    compensated_individus: [
      "Nombre d'individus qui ont été compensés pour atténuer les impacts du projet.",
      "Number of individus compensated to mitigate the project's impacts.",
    ],
  },
} as const satisfies Record<string, Record<string, readonly [string, string]>>;

function quotePostgresIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quotePostgresLiteral(value: string) {
  if (value.includes("\0")) throw new Error("PostgreSQL literals cannot contain null bytes");
  return `E'${value.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

async function applyColumnComments(knex: Knex, direction: "up" | "down") {
  const commentIndex = direction === "up" ? 1 : 0;

  for (const [tableName, columns] of Object.entries(columnComments)) {
    for (const [columnName, comments] of Object.entries(columns)) {
      const qualifiedColumn = `${quotePostgresIdentifier(tableName)}.${quotePostgresIdentifier(columnName)}`;
      await knex.raw(
        `COMMENT ON COLUMN ${qualifiedColumn} IS ${quotePostgresLiteral(comments[commentIndex])}`,
      );
    }
  }
}

async function renameTables(knex: Knex, renames: readonly (readonly [string, string])[]) {
  for (const [from, to] of renames) {
    await knex.schema.renameTable(from, to);
  }
}

async function renameColumns(knex: Knex, renames: typeof columnRenames, direction: "up" | "down") {
  const entries = Object.entries(renames);
  if (direction === "down") entries.reverse();

  for (const [tableName, columns] of entries) {
    const orderedColumns = direction === "up" ? columns : [...columns].reverse();
    for (const [oldName, newName] of orderedColumns) {
      const from = direction === "up" ? oldName : newName;
      const to = direction === "up" ? newName : oldName;
      await knex.schema.alterTable(tableName, (table) => table.renameColumn(from, to));
    }
  }
}

export const up = async (knex: Knex) => {
  await renameTables(knex, tableRenames);
  await renameColumns(knex, columnRenames, "up");
  await applyColumnComments(knex, "up");
  await knex.raw('ALTER TYPE "TypeDossier" RENAME TO type_dossier');
};

export const down = async (knex: Knex) => {
  await knex.raw('ALTER TYPE type_dossier RENAME TO "TypeDossier"');
  await applyColumnComments(knex, "down");
  await renameColumns(knex, columnRenames, "down");
  await renameTables(
    knex,
    [...tableRenames].reverse().map(([oldName, newName]) => [newName, oldName]),
  );
};
