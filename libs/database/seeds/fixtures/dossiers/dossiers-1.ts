import type { SeedDossier } from "./types.ts";
import { cartographie, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS_CHUNK_1: SeedDossier[] = [
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
      "Dossier reçu le 18/03/2024. Demande de compléments transmise le 05/06/2024 concernant le protocole de suivi des reptiles. Réponse reçue le 22/09/2024. Instruction en cours.\n- 18/03/2024 : dépôt du dossier\n- 05/06/2024 : demande de compléments (suivi reptiles)\n- 22/09/2024 : réception des compléments",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: true,
    next_action_expected_from: "Instructeur",
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
];
