import type { SeedDossier } from "./types.ts";
import { cartographie, ligne, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS_CHUNK_6: SeedDossier[] = [
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
];
