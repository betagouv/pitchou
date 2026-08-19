import type { SeedDossier } from "./types.ts";
import { cartographie, ligne, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS: SeedDossier[] = [
  // -------------------------------------------------------------------------
  // D1 — Parc éolien des Monts d'Arrée – DREAL BRETAGNE
  // Phase actuelle : Controle (décision signée, prescriptions en cours)
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000001",
    groupe_instructeur: "DREAL BRETAGNE",
    demandeur_personne_physique_email: "yannick.tanguy@example.org",
    // demandeur identity + mandataire: the dossier was filed by an engineering firm
    // (mandataire) on behalf of the demandeur.
    deposant_email: "yannick.tanguy@example.org",
    mandataire_email: "claire.morvan@biotope-ouest.example",
    depot_date: new Date("2022-09-14T08:30:00+00:00"),
    departments: ["29"],
    communes: [
      { name: "Brasparts", code: "29015", postalCode: "29190" },
      { name: "Saint-Rivoal", code: "29263", postalCode: "29190" },
    ],
    regions: ["Bretagne"],
    // Zones drawn on the map in Démarche Numérique (Monts d'Arrée, Brasparts).
    projet_map: cartographie(
      zoneCarree(-3.9615, 48.3035, 0.007, "Emprise du parc éolien"),
      zoneCarree(-3.9495, 48.2995, 0.005, "Zone de survol"),
    ),
    name: "Parc éolien des Monts d'Arrée – Brasparts et Saint-Rivoal (29)",
    ddep_required: true,
    free_comment:
      "Dossier complet déposé en septembre 2022. Avis CSRPN favorable sous conditions rendu en mars 2023. Arrêté préfectoral signé le 12/07/2023. Suivi chiroptères en cours – premier rapport transmis conforme.",
    onagre_demande_identifier: "2022-09-14d-00291",
    public_consultation_start_date: null,
    linked_to_ae_regime: true,
    next_action_expected_from: "Pétitionnaire",
    next_action_expected: "Compléter le dossier",
    main_activite: "Production énergie renouvelable - Éolien",
    description:
      "Projet de construction d'un parc éolien de 5 machines sur les communes de Brasparts et Saint-Rivoal, dans le massif des Monts d'Arrée. Le site est situé à proximité du Parc Naturel Régional d'Armorique et présente des enjeux importants pour les chiroptères (Grand rhinolophe, Murin de Bechstein) et l'avifaune (Milan royal, Busard Saint-Martin).",
    intervention_start_date: new Date("2023-03-01"),
    intervention_end_date: new Date("2026-12-31"),
    intervention_duration: 3,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Plusieurs variantes d'implantation ont été étudiées. La variante retenue est celle minimisant les impacts sur les habitats de chiroptères identifiés lors des inventaires naturalistes. Les zones boisées et les corridors écologiques majeurs ont été exclus de l'implantation.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification:
      "Le projet contribue à l'atteinte des objectifs nationaux de production d'énergie renouvelable fixés par la loi de programmation énergie-climat et participe à la réduction des émissions de gaz à effet de serre.",
    mesures_erc_planned: true,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: true,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: true,
    public_consultation_end_date: null,
    er_mesures_sufficient: false,
    enjeu: true,
  },
  // -------------------------------------------------------------------------
  // D2 — Centrale photovoltaïque La Gardiole – DREAL Occitanie
  // Phase actuelle : Instruction
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000002",
    groupe_instructeur: "DREAL Occitanie",
    demandeur_personne_physique_email: "soizic.rieux@example.org",
    // demandeur identity only (the demandeur deposited the dossier themself)
    deposant_email: "soizic.rieux@example.org",
    depot_date: new Date("2024-03-18T10:15:00+00:00"),
    departments: ["34"],
    communes: [{ name: "Montagnac", code: "34163", postalCode: "34530" }],
    regions: ["Occitanie"],
    // Centrale photovoltaïque au sol, garrigue près de Montagnac (34).
    projet_map: cartographie(zoneCarree(3.4805, 43.4805, 0.012, "Emprise clôturée de la centrale")),
    name: "Centrale photovoltaïque au sol La Gardiole – Montagnac (34)",
    ddep_required: true,
    free_comment:
      "Dossier reçu le 18/03/2024. Demande de compléments transmise le 05/06/2024 concernant le protocole de suivi des reptiles. Réponse reçue le 22/09/2024. Projet d'arrêté transmis à la signature préfectorale.\n- 18/03/2024 : dépôt du dossier\n- 05/06/2024 : demande de compléments (suivi reptiles)\n- 22/09/2024 : réception des compléments",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: true,
    next_action_expected_from: "Préfet·e",
    next_action_expected: "Signer l'arrêté",
    main_activite: "Production énergie renouvelable - Photovoltaïque",
    description:
      "Projet de centrale photovoltaïque au sol d'une puissance installée de 12 MWc sur des parcelles de garrigue et friches agricoles sur la commune de Montagnac. La surface clôturée sera de 18 hectares. Des inventaires naturalistes ont mis en évidence la présence de la Couleuvre de Montpellier, du Lézard ocellé et de l'Outarde canepetière.",
    intervention_start_date: new Date("2025-09-01"),
    intervention_end_date: new Date("2055-09-01"),
    intervention_duration: 30,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Le site retenu est constitué de friches agricoles et de garrigue dégradée, sans enjeu agricole. Plusieurs variantes d'implantation ont été étudiées permettant d'éviter les secteurs à plus forte densité de reptiles et les zones de nidification connues de l'Outarde canepetière.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification:
      "Le projet s'inscrit dans le cadre du Plan de Relance national et contribue à la souveraineté énergétique française en produisant de l'énergie décarbonée.",
    mesures_erc_planned: true,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: true,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: true,
    public_consultation_end_date: null,
    er_mesures_sufficient: false,
    enjeu: false,
  },
  // -------------------------------------------------------------------------
  // D3 — Rénovation immeuble – Hirondelles – DREAL Grand Est
  // Phase actuelle : Controle
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000003",
    // no identite_dossier rows on purpose: dossier not yet re-synced (all cards empty)
    groupe_instructeur: "DREAL Grand Est",
    demandeur_personne_physique_email: "herve.klein@example.org",
    depot_date: new Date("2024-06-03T07:55:00+00:00"),
    departments: ["57"],
    communes: [{ name: "Thionville", code: "57672", postalCode: "57100" }],
    regions: ["Grand Est"],
    // Façade d'un immeuble en centre-ville de Thionville (57).
    projet_map: cartographie(
      zoneCarree(6.168, 49.358, 0.0015, "Façade concernée par le ravalement"),
    ),
    name: "Rénovation de façade – nids d'hirondelles – Thionville (57)",
    ddep_required: null,
    free_comment:
      "ERsuf signé le 03/06/2024. Courrier préfectoral transmis le 18/09/2024. Suivi 2025 réalisé – nids artificiels posés conformément.",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: false,
    next_action_expected_from: "Instructeur",
    next_action_expected: "Consulter le dossier",
    main_activite:
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d'art",
    description:
      "Ravalement de façade d'un immeuble résidentiel de 6 étages rue de la Paix à Thionville. La façade accueille 2 nids actifs d'Hirondelle de fenêtre (Delichon urbicum). Les travaux sont prévus en dehors de la période de reproduction.",
    intervention_start_date: new Date("2024-09-16"),
    intervention_end_date: new Date("2025-02-28"),
    intervention_duration: 0,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Le ravalement est impératif pour des raisons de sécurité publique (risque de chute d'enduit). Un report après la saison de reproduction 2025 est impossible car le bâtiment est classé dangereux.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification: "",
    mesures_erc_planned: true,
    dossier_oiseau_simple_destroyed_nids_count: 2,
    dossier_oiseau_simple_compensated_nids_count: 4,
    type: "Hirondelle",
    demarche_number: 88444,
    ecological_inventory_completed: false,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: false,
    public_consultation_end_date: null,
    er_mesures_sufficient: false,
    enjeu: false,
  },
  // -------------------------------------------------------------------------
  // D4 — Suivi chiroptères cavernicoles – DREAL Auvergne-Rhône-Alpes
  // Phase actuelle : Instruction
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000004",
    groupe_instructeur: "DREAL Auvergne-Rhône-Alpes",
    demandeur_personne_morale: "42391560100027",
    representative_email: "thomas.delattre@chauve-souris-auvergne.example",
    // demandeur identity + representant (same person in both roles)
    deposant_email: "thomas.delattre@chauve-souris-auvergne.example",
    depot_date: new Date("2024-11-07T14:20:00+00:00"),
    departments: ["63"],
    communes: [
      { name: "Issoire", code: "63178", postalCode: "63500" },
      { name: "Vic-le-Comte", code: "63458", postalCode: "63270" },
    ],
    regions: ["Auvergne-Rhône-Alpes"],
    // Réseau de grottes entre Issoire et Vic-le-Comte (63).
    projet_map: cartographie(
      zoneCarree(3.249, 45.545, 0.006, "Grottes secteur Issoire"),
      zoneCarree(3.216, 45.646, 0.006, "Grottes secteur Vic-le-Comte"),
    ),
    name: "Inventaire chiroptères cavernicoles – réseau de grottes du Puy-de-Dôme",
    ddep_required: true,
    free_comment:
      "Dossier scientifique complet. En cours d'instruction. Protocole conforme aux recommandations du MNHN.",
    onagre_demande_identifier: "2024-11-00291-001-001",
    public_consultation_start_date: null,
    linked_to_ae_regime: false,
    next_action_expected_from: "Instructeur",
    next_action_expected: "Consulter le dossier",
    main_activite: "Demande à caractère scientifique",
    description:
      "Dans le cadre de la mise à jour de l'Atlas des chauves-souris du Puy-de-Dôme, l'association Chauve-Souris Auvergne souhaite réaliser des inventaires dans un réseau de 14 cavités naturelles et ouvrages souterrains. L'objectif est de mettre à jour les données de présence et d'abondance pour six espèces cavernicoles prioritaires : Grand rhinolophe, Petit rhinolophe, Grand murin, Murin de Bechstein, Vespertilion à oreilles échancrées et Minioptère de Schreibers.",
    intervention_start_date: new Date("2025-10-01"),
    intervention_end_date: new Date("2028-04-30"),
    intervention_duration: null,
    scientifique_demande_type: [
      "Une/des capture(s)/relâcher(s) immédiat(s) sur place sans marquage",
    ],
    scientifique_suivi_protocol_description:
      "Protocole standardisé de comptage hivernal (méthode ICA) combinant observation visuelle et enregistrement acoustique à l'entrée des cavités. Une session de capture au filet japonais sera réalisée à l'entrée de 3 sites sélectionnés pour confirmation d'espèces difficiles à identifier acoustiquement. Capture et relâcher immédiat, sans baguage.",
    scientifique_capture_mode: ["Avec filet japonais"],
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter:
      "Réseau de 14 cavités naturelles et ouvrages souterrains sur les communes d'Issoire et Vic-le-Comte (Puy-de-Dôme).",
    scientifique_intervenants: [
      {
        nom_complet: "DELATTRE Thomas",
        qualification: "Doctorat écologie – coordinateur régional MNHN",
      },
      {
        nom_complet: "FAURE Mathilde",
        qualification: "Master 2 biologie de la conservation",
      },
      {
        nom_complet: "CHARBONNIER Julien",
        qualification: "BTS GPN – chiroptérologue bénévole agréé",
      },
    ],
    scientifique_other_intervenants_details:
      "Les bénévoles présents lors des inventaires n'effectueront pas de manipulations directes sur les individus.",
    scientifique_previous_assessment: true,
    scientifique_demande_purposes: [
      "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'élaboration ou du suivi de plans, de schémas, de programmes ou d'autres documents de planification nécessitant l'acquisition de connaissances ou visant à la préservation du patrimoine naturel prévus par des dispositions du code de l'environnement.",
    ],
    no_other_satisfactory_solution_justification:
      "L'identification certaine de certaines espèces du genre Myotis nécessite l'examen morphologique en main. La seule écoute passive ne permet pas une identification fiable sans risque de confusion.",
    motif_derogation: "A des fins de recherche et d'enseignement",
    motif_derogation_justification:
      "Le programme s'intègre dans le Plan National d'Actions en faveur des chauves-souris (PNA 2021-2030). Les données collectées alimenteront directement l'observatoire national des chiroptères.",
    mesures_erc_planned: false,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: null,
    especes_present_in_influence_area: null,
    risk_despite_erc_mesures: null,
    public_consultation_end_date: null,
    er_mesures_sufficient: null,
    enjeu: false,
  },
  // -------------------------------------------------------------------------
  // D5 — Centre de soins faune sauvage – DREAL Pays de la loire
  // Phase actuelle : Accompagnement amont
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000005",
    groupe_instructeur: "DREAL Pays de la loire",
    demandeur_personne_morale: "78616022400031",
    representative_email: "sandrine.bureau@lpo-paysdelaloire.example",
    // demandeur identity + representant (same person in both roles)
    deposant_email: "sandrine.bureau@lpo-paysdelaloire.example",
    depot_date: new Date("2025-02-10T09:05:00+00:00"),
    departments: ["44", "49", "53", "72", "85"],
    communes: null,
    regions: ["Pays-de-la-Loire"],
    // Sites de relâcher autour du centre de soins LPO (Nantes / Loire-Atlantique).
    projet_map: cartographie(
      zoneCarree(-1.554, 47.218, 0.004, "Centre de soins"),
      zoneCarree(-1.62, 47.28, 0.004, "Site de relâcher nord"),
      zoneCarree(-1.48, 47.16, 0.004, "Site de relâcher sud"),
    ),
    name: "Transport et relâcher d'espèces protégées – Centre de soins LPO Pays de la Loire",
    ddep_required: false,
    free_comment:
      "Dossier incomplet à réception. Courrier de demande de compléments envoyé le 14/03/2025. En attente de réponse du pétitionnaire.",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: false,
    next_action_expected_from: "Pétitionnaire",
    next_action_expected: "Compléter le dossier",
    main_activite: "Conservation des espèces",
    description:
      "Le centre de soins pour la faune sauvage géré par la LPO Pays de la Loire (Nantes, 44) accueille annuellement plusieurs centaines d'animaux sauvages protégés blessés ou en détresse. La dérogation demandée concerne le transport de spécimens d'espèces protégées depuis leur lieu de découverte jusqu'au centre de soins, et leur relâcher ultérieur dans leur milieu naturel après rétablissement.",
    intervention_start_date: new Date("2026-01-01"),
    intervention_end_date: new Date("2030-12-31"),
    intervention_duration: 5,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions:
      "Transport en caisses de contention adaptées à chaque espèce, selon les protocoles vétérinaires en vigueur.",
    scientifique_intervention_perimeter:
      "Ensemble du territoire des cinq departments de la région Pays de la Loire.",
    scientifique_intervenants: [
      {
        nom_complet: "BUREAU Sandrine",
        qualification: "Vétérinaire responsable du centre de soins",
      },
      {
        nom_complet: "GARNIER Loïc",
        qualification: "Soigneur animalier capacitaire",
      },
    ],
    scientifique_other_intervenants_details:
      "Les bénévoles transporteurs sont formés à la contention sécurisée des animaux sauvages.",
    scientifique_previous_assessment: true,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Le transport est indispensable au fonctionnement du centre de soins. Aucune alternative ne permet de soigner des animaux blessés sans les déplacer.",
    motif_derogation: "Conservation des espèces",
    motif_derogation_justification: "",
    mesures_erc_planned: false,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: null,
    especes_present_in_influence_area: null,
    risk_despite_erc_mesures: null,
    public_consultation_end_date: null,
    er_mesures_sufficient: null,
    enjeu: false,
  },
  // -------------------------------------------------------------------------
  // D6 — Déviation de la RD 73 – DREAL Normandie
  // Phase actuelle : Instruction (en attente avis CNPN)
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000006",
    groupe_instructeur: "DREAL Normandie",
    demandeur_personne_morale: "22760540400019",
    representative_email: "elodie.vasseur@seinemaritime.example",
    depot_date: new Date("2023-05-22T13:45:00+00:00"),
    departments: ["76"],
    communes: [
      { name: "Yvetot", code: "76759", postalCode: "76190" },
      { name: "Valliquerville", code: "76726", postalCode: "76190" },
    ],
    regions: ["Normandie"],
    // Tracé de la déviation routière entre Yvetot et Valliquerville (76).
    projet_map: cartographie(
      ligne(
        [
          [0.756, 49.617],
          [0.74, 49.622],
          [0.72, 49.628],
          [0.7, 49.63],
        ],
        "Tracé de la déviation RD 73",
      ),
    ),
    name: "Déviation de la RD 73 – Yvetot / Valliquerville (76)",
    ddep_required: true,
    free_comment:
      "Dossier reçu le 22/05/2023. Rattaché à l'AE instruite par la préfecture de Seine-Maritime.\n- 22/05/2023 : dépôt du dossier\n- 08/09/2023 : demande de compléments (impact zone humide)\n- 14/02/2024 : réception compléments\n- 03/06/2024 : saisine CNPN\n- En attente avis CNPN",
    onagre_demande_identifier: "2023-05-00076-001-002",
    public_consultation_start_date: new Date("2023-10-16"),
    linked_to_ae_regime: true,
    next_action_expected_from: "CNPN/CSRPN",
    next_action_expected: null,
    main_activite: "Infrastructures de transport routières",
    description:
      "Création d'une déviation de 3,4 km de la route départementale 73 au sud d'Yvetot, afin de délester le centre-bourg du trafic de transit. Le tracé traverse une zone bocagère présentant des enjeux pour le Triton crêté, la Rainette verte, plusieurs espèces de chiroptères et le Murin de Bechstein. Une zone humide de 2,4 ha sera impactée de manière résiduelle malgré les mesures d'évitement.",
    intervention_start_date: new Date("2025-03-01"),
    intervention_end_date: new Date("2027-06-30"),
    intervention_duration: 2,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Quatre variantes de tracé ont été comparées. La variante retenue est celle présentant le moindre impact sur les zones à enjeux écologiques forts, notamment les corridors boisés et les mares à Triton crêté. Un tracé plus au nord présentait des impacts beaucoup plus importants sur des boisements anciens.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification:
      "La déviation répond à un enjeu de sécurité routière (route accidentogène traversant une zone scolaire) et de qualité de vie des riverains du centre-bourg d'Yvetot.",
    mesures_erc_planned: true,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: true,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: true,
    public_consultation_end_date: new Date("2023-11-17"),
    er_mesures_sufficient: false,
    enjeu: true,
  },
  // -------------------------------------------------------------------------
  // D7 — Extension carrière de calcaire – DREAL BFC
  // Phase actuelle : Classé sans suite
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000007",
    groupe_instructeur: "DREAL BFC",
    demandeur_personne_morale: "39284715600014",
    representative_email: "bernard.chevallier@carrieres-nuiton.example",
    // All three identities: the demandeur identity is the representant, and the dossier
    // was filed by a mandataire (a bureau d'étude).
    deposant_email: "bernard.chevallier@carrieres-nuiton.example",
    mandataire_email: "sophie.leduc@gerea-etudes.example",
    depot_date: new Date("2023-11-28T11:10:00+00:00"),
    departments: ["21"],
    communes: [{ name: "Nuits-Saint-Georges", code: "21458", postalCode: "21700" }],
    regions: ["Bourgogne-Franche-Comté"],
    // Carrière de calcaire et son extension près de Nuits-Saint-Georges (21).
    projet_map: cartographie(
      zoneCarree(4.949, 47.135, 0.01, "Carrière existante"),
      zoneCarree(4.962, 47.14, 0.008, "Périmètre d'extension"),
    ),
    name: "Extension de la carrière de calcaire de Chaux – Nuits-Saint-Georges (21)",
    ddep_required: true,
    free_comment:
      "Dossier reçu le 28/11/2023. Demande de compléments envoyée le 15/02/2024 (absence d'inventaire chiroptères hivernal). Relance adressée le 18/06/2024. Sans réponse du pétitionnaire. Dossier classé sans suite le 15/11/2024 pour non-réponse dans le délai imparti.",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: false,
    next_action_expected_from: null,
    next_action_expected: null,
    main_activite: "Carrières",
    description:
      "Extension d'une carrière de calcaire existante vers le nord sur 8 hectares supplémentaires. Les inventaires naturalistes révèlent la présence de pelouses calcicoles abritant plusieurs espèces d'orchidées protégées et un habitat favorable pour le Lézard des souches et le Grand rhinolophe.",
    intervention_start_date: null,
    intervention_end_date: null,
    intervention_duration: null,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification: "",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification: "",
    mesures_erc_planned: null,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: false,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: null,
    public_consultation_end_date: null,
    er_mesures_sufficient: null,
    enjeu: false,
  },
  // -------------------------------------------------------------------------
  // D8 — Réhabilitation clocher – Cigognes – DRIAT IDF
  // Phase actuelle : Controle
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000008",
    groupe_instructeur: "DRIAT IDF",
    demandeur_personne_morale: "21770379200013",
    representative_email: "jeanmarc.aubry@mairie-provins.example",
    depot_date: new Date("2023-09-11T08:40:00+00:00"),
    departments: ["77"],
    communes: [{ name: "Provins", code: "77379", postalCode: "77160" }],
    regions: ["Île-de-France"],
    // Clocher de l'église Saint-Quiriace, centre historique de Provins (77).
    projet_map: cartographie(zoneCarree(3.2985, 48.5595, 0.0012, "Clocher accueillant le nid")),
    name: "Réhabilitation du clocher de l'église Saint-Quiriace – nid de cigognes – Provins (77)",
    ddep_required: null,
    free_comment:
      "ERsuf signé le 11/09/2023. Arrêté préfectoral signé le 20/01/2024. Plateforme de nidification posée – conforme. Suivi 2024 : couple non revenu sur le site.",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: false,
    next_action_expected_from: "Instructeur",
    next_action_expected: "Consulter le dossier",
    main_activite:
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d'art",
    description:
      "Réfection de la toiture et du campanile de l'église Saint-Quiriace à Provins, classée monument historique. Le nid actif d'une cigogne blanche (Ciconia ciconia) devra être temporairement déplacé pour permettre l'accès aux maçons. Une plateforme métallique de substitution sera installée à proximité immédiate.",
    intervention_start_date: new Date("2024-02-01"),
    intervention_end_date: new Date("2024-10-31"),
    intervention_duration: 0,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Les travaux de réfection de la toiture sont impératifs pour assurer la pérennité du monument historique et la sécurité des visiteurs. Un report est impossible, l'état de la charpente étant dégradé.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification: "",
    mesures_erc_planned: true,
    dossier_oiseau_simple_destroyed_nids_count: 1,
    dossier_oiseau_simple_compensated_nids_count: 2,
    type: "Cigogne",
    demarche_number: 88444,
    ecological_inventory_completed: false,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: false,
    public_consultation_end_date: null,
    er_mesures_sufficient: false,
    enjeu: false,
  },
  // -------------------------------------------------------------------------
  // D9 — Aménagement des berges du Kourou – DGTM Guyane
  // Phase actuelle : Instruction
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000009",
    groupe_instructeur: "DGTM Guyane",
    demandeur_personne_morale: "21973304600011",
    representative_email: "ml.adelaide@ville-kourou.example",
    depot_date: new Date("2024-07-30T15:00:00+00:00"),
    departments: ["973"],
    communes: [{ name: "Kourou", code: "97304", postalCode: "97310" }],
    regions: ["Guyane"],
    // Berges du fleuve Kourou en Guyane (973).
    projet_map: cartographie(
      ligne(
        [
          [-52.655, 5.155],
          [-52.65, 5.16],
          [-52.646, 5.166],
        ],
        "Berges à aménager",
      ),
      zoneCarree(-52.648, 5.162, 0.004, "Zone de renaturation"),
    ),
    name: "Aménagement des berges du Kourou – protection contre les crues – Kourou (973)",
    ddep_required: true,
    free_comment:
      "Dossier en cours d'instruction. Enjeux importants liés à la présence du Caïman noir et de tortues aquatiques protégées. Demande de compléments en cours de rédaction.",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: true,
    next_action_expected_from: "Instructeur",
    next_action_expected: null,
    main_activite: "Projets liés à la gestion de l'eau",
    description:
      "Travaux de protection des berges du fleuve Kourou contre les crues et l'érosion, sur une linéaire de 1,2 km en aval de la ville. Le projet prévoit la mise en place d'enrochements et d'épis hydrauliques. Les inventaires identifient la présence du Caïman noir (Melanosuchus niger), du Caïman à lunettes (Caiman crocodilus), de la Tortue-matamata (Chelus fimbriatus) et de plusieurs espèces de poissons protégés.",
    intervention_start_date: new Date("2026-02-01"),
    intervention_end_date: new Date("2026-09-30"),
    intervention_duration: 0,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Les travaux sont localisés dans un secteur où les berges sont en cours d'effondrement, menaçant des habitations et infrastructures. Un déplacement du linéaire de travaux vers l'amont réduirait l'efficacité hydraulique de la protection.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification:
      "La protection contre les crues garantit la sécurité des populations riveraines et des installations du Centre Spatial Guyanais.",
    mesures_erc_planned: true,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: true,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: true,
    public_consultation_end_date: null,
    er_mesures_sufficient: false,
    enjeu: true,
  },
  // -------------------------------------------------------------------------
  // D10 — Aménagement de lotissement – Dév Pitchou (réplique d'un dossier prod)
  // Phase actuelle : Accompagnement amont
  // Demandeur personne morale, espèces impactées, avis CNPN, arrêté + contrôle.
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000010",
    groupe_instructeur: "Dév Pitchou",
    demandeur_personne_morale: "88800620200020",
    representative_email: "katell.legoff@echappee-belle.example",
    depot_date: new Date("2026-05-26T08:00:00+00:00"),
    departments: ["22"],
    communes: [{ name: "Ploufragan", code: "22215", postalCode: "22440" }],
    regions: ["Bretagne"],
    // Emprise du futur lotissement à Ploufragan (22).
    projet_map: cartographie(zoneCarree(-2.783, 48.5, 0.008, "Emprise du lotissement")),
    name: "Aménagement de lotissement",
    ddep_required: null,
    free_comment: "",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: null,
    next_action_expected_from: null,
    next_action_expected: null,
    main_activite: "Aménagements fonciers (AFAF, remembrement)",
    description: "Aménagement d'un lotissement dans la campagne de ploufragan, ça sera tout calme",
    intervention_start_date: new Date("2026-11-20"),
    intervention_end_date: new Date("2029-11-20"),
    intervention_duration: 5,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Nous avons besoin de logements à ploufragan c'est important",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification: "cf rapport du maire et de l'écologue",
    mesures_erc_planned: null,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: true,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: true,
    public_consultation_end_date: null,
    er_mesures_sufficient: null,
    enjeu: true,
  },
  // -------------------------------------------------------------------------
  // D11 — Agrandissement pistes cyclables Rennes-Dinan – Dév Pitchou
  // Phase actuelle : Accompagnement amont (après un aller-retour Instruction/Controle)
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000011",
    groupe_instructeur: "Dév Pitchou",
    demandeur_personne_morale: "88800620200020",
    representative_email: "katell.legoff@echappee-belle.example",
    depot_date: new Date("2026-05-05T08:00:00+00:00"),
    departments: ["99", "35", "22"],
    communes: null,
    regions: ["Bretagne"],
    // Tracé linéaire de la piste cyclable entre Rennes et Dinan (35 / 22).
    projet_map: cartographie(
      ligne(
        [
          [-1.68, 48.11],
          [-1.78, 48.2],
          [-1.9, 48.32],
          [-2.05, 48.455],
        ],
        "Tracé de la piste cyclable Rennes-Dinan",
      ),
    ),
    name: "Agrandissement pistes cyclables Rennes-Dinan",
    ddep_required: true,
    free_comment:
      'Je fais un test de commentaire qui servira pour tester la recherche, avec le mot "coquelicot"',
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: null,
    next_action_expected_from: "Pétitionnaire",
    next_action_expected: "Compléter le dossier",
    main_activite: "Infrastructures de transport routières",
    description:
      "De plus en plus de bretons souhaitent circuler entre Rennes et Dinan dans des véhicules non mototrisés. Leur nombre est devenu si important que la piste cyclable actuelle est trop petite et dangereuse, les conseils départementaux ont sollicité notre entreprise pour l'élargir. La piste passe par des zones de forêts et d'étangs.",
    intervention_start_date: new Date("2027-05-11"),
    intervention_end_date: new Date("2027-10-22"),
    intervention_duration: 2,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "En partenariats avec des experts de l'aménagement et de la biodiversité nous n'avons pas trouvé d'alternative pour maintenir la sécurité des personnes.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification:
      "- consultation de plusieurs alternatives d'aménagement - consultation d'experts écologue - autre point important",
    mesures_erc_planned: null,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: true,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: true,
    public_consultation_end_date: null,
    er_mesures_sufficient: null,
    enjeu: false,
  },
];
