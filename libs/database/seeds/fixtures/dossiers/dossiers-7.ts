import type { SeedDossier } from "./types.ts";
import { cartographie, ligne, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS_CHUNK_7: SeedDossier[] = [
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
