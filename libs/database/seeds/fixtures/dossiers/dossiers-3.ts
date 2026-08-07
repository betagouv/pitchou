import type { SeedDossier } from "./types.ts";
import { cartographie, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS_CHUNK_3: SeedDossier[] = [
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
];
