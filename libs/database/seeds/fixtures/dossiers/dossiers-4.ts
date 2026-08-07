import type { SeedDossier } from "./types.ts";
import { cartographie, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS_CHUNK_4: SeedDossier[] = [
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
];
