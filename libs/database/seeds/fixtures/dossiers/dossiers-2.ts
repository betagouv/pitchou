import type { SeedDossier } from "./types.ts";
import { cartographie, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS_CHUNK_2: SeedDossier[] = [
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
];
