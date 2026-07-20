/**
 * Synthetic seed data for 9 realistic dossiers and their related entities.
 *
 * DS numbers: 99000001–99000009
 *
 * Each dossier is assigned to a groupe_instructeur matching its department/region.
 * groupe_instructeur is NOT a column on the dossier table — it is used by the seed
 * to populate edge_groupe_instructeurs__dossier.
 */

import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";
import type { GeoJSONFeatureCollection } from "@pitchou/types/API_Pitchou.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { PrescriptionInitializer } from "@pitchou/types/database/public/Prescription.ts";
import type { ControleInitializer } from "@pitchou/types/database/public/Controle.ts";
import type { EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

// ---------------------------------------------------------------------------
// Seed-specific types
// Branded FK fields (DossierId, PersonneId…) and file refs are replaced with
// plain primitives since seed data is inserted before those FKs are resolved.
// groupe_instructeur is extra metadata used to populate the junction table.
// ---------------------------------------------------------------------------

type SeedDossier = Omit<
  DossierInitializer,
  | "id"
  | "demarche_numerique_id"
  | "deposant"
  | "demandeur_personne_physique"
  | "demandeur_personne_morale"
  | "representative"
  | "especes_impactees"
> & {
  groupe_instructeur: string;
  /** SIRET de l'entreprise demandeuse (personne morale). L'entreprise doit figurer dans SEED_ENTREPRISES. */
  demandeur_personne_morale?: string;
  /** Email of the personne physique demandeur. The personne must be listed in SEED_PERSONNES. */
  demandeur_personne_physique_email?: string;
  /** Email of the representant (personne morale), stored as an identite_dossier snapshot. The personne must be listed in SEED_PERSONNES. */
  representative_email?: string;
  /** Email of the demandeur identity (DN identity block), stored as an identite_dossier snapshot and linked as dossier.deposant. The personne must be listed in SEED_PERSONNES. */
  deposant_email?: string;
  /** Email of the mandataire (when the dossier was deposited par un tiers), stored as an identite_dossier snapshot. The personne must be listed in SEED_PERSONNES. */
  mandataire_email?: string;
};

type SeedAvisExpert = Omit<
  AvisExpertInitializer,
  "id" | "dossier" | "saisine_fichier" | "avis_fichier"
> & {
  id: string;
  dossier: string;
  /** When set, a placeholder PDF is generated and linked as the saisine file. */
  nom_fichier_saisine?: string;
  /** When set, a placeholder PDF is generated and linked as the avis file. */
  nom_fichier_avis?: string;
};

type SeedEvenementPhaseDossier = Omit<
  EvenementPhaseDossierInitializer,
  "dossier" | "caused_by_personne"
> & {
  dossier: string;
};

type SeedDecisionAdministrative = Omit<
  DecisionAdministrativeInitializer,
  "id" | "dossier" | "fichier"
> & {
  id: string;
  dossier: string;
  /** When set, a placeholder PDF is generated and linked as the décision's fichier. */
  nom_fichier?: string;
};

type SeedPrescription = Omit<PrescriptionInitializer, "id" | "decision_administrative"> & {
  id: string;
  decision_administrative: string;
};

type SeedControle = Omit<ControleInitializer, "id" | "prescription"> & {
  id: string;
  prescription: string;
};

// An "entreprise" (demandeur personne morale). Inserted before the dossiers that reference it.
type SeedEntreprise = {
  siret: string;
  legal_name: string;
  address: string | null;
  siren?: string | null;
  legal_form?: string | null;
  naf_code?: string | null;
  naf_label?: string | null;
  /** ISO date string ("YYYY-MM-DD"). */
  creation_date?: string | null;
  /** Raw Démarche Numérique value: "Actif" or "Ferme". */
  admin_status?: string | null;
  /** Headcount range label, e.g. "50 à 99 salariés". */
  headcount?: string | null;
  /** Share capital in euros, as a string. */
  share_capital?: string | null;
  insee_code?: string | null;
  postal_code?: string | null;
  department?: string | null;
  region?: string | null;
};

// A personne used as a demandeur personne physique or as a representative of a personne morale.
// Resolved by email at seed time. Inserted before the dossiers that reference it.
type SeedPersonne = {
  last_name: string;
  first_names: string;
  email: string;
  address?: string | null;
  phone?: string | null;
  role?: string | null;
};

// One impacted-species line, used to build the "espèces impactées" ODS file.
type SeedLigneEspeceImpactee = {
  classification: "oiseau" | "faune non-oiseau" | "flore";
  /** CD_REF of the espèce; must be resolvable in the espece_protegee view */
  cd_ref: string;
  /** "Identifiant Pitchou" of the threatening activité (e.g. "P-4-1", "P-4-2", "P-60") */
  identifiant_pitchou_activité: string;
  nombre_individus?: string;
  nombre_nids?: number;
  nombre_oeufs?: number;
  surface_habitat_détruit?: number;
};

// "Espèces impactées" file spec for a dossier (generated as ODS at seed time).
type SeedEspecesImpactees = {
  /** demarche_numerique_number of the dossier */
  dossier: string;
  nom_fichier: string;
  lignes: SeedLigneEspeceImpactee[];
};

// ---------------------------------------------------------------------------
// "Cartographie du projet" helpers
//
// The map data is a GeoJSON FeatureCollection, exactly as synced from Démarche
// Numérique. These helpers build plausible zones near each dossier's location so
// the feature is visible in local/staging demos.
// ---------------------------------------------------------------------------

/** A square Polygon zone of side ~`size`° centered on [lng, lat]. */
function zoneCarree(lng: number, lat: number, size: number, description: string) {
  const h = size / 2;
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng - h, lat - h],
          [lng + h, lat - h],
          [lng + h, lat + h],
          [lng - h, lat + h],
          [lng - h, lat - h],
        ],
      ],
    },
    properties: { source: "selection_utilisateur", description },
  };
}

/** A LineString feature following the given [lng, lat] points (e.g. a linear project). */
function ligne(points: [number, number][], description: string) {
  return {
    type: "Feature" as const,
    geometry: { type: "LineString", coordinates: points },
    properties: { source: "selection_utilisateur", description },
  };
}

/** Wrap features into a GeoJSON FeatureCollection. */
function cartographie(
  ...features: ReturnType<typeof zoneCarree | typeof ligne>[]
): GeoJSONFeatureCollection {
  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// Dossiers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Entreprises (demandeurs personne morale)
// ---------------------------------------------------------------------------

export const SEED_ENTREPRISES: SeedEntreprise[] = [
  // D10 & D11 — demandeur personne morale
  {
    siret: "88800620200020",
    legal_name: "L'ECHAPPEE BELLE",
    siren: "888006202",
    legal_form: "SAS, société par actions simplifiée",
    naf_code: "41.10A",
    naf_label: "Promotion immobilière de logements",
    creation_date: "2020-06-15",
    admin_status: "Actif",
    headcount: "50 à 99 salariés",
    share_capital: "50000",
    address: "12 rue des Ajoncs\n22440 Ploufragan",
    insee_code: "22215",
    postal_code: "22440",
    department: "Côtes-d'Armor",
    region: "Bretagne",
  },
  // D4 — inventaire chiroptères (association)
  {
    siret: "42391560100027",
    legal_name: "CHAUVE-SOURIS AUVERGNE",
    siren: "423915601",
    legal_form: "Association déclarée",
    naf_code: "94.99Z",
    naf_label: "Autres organisations fonctionnant par adhésion volontaire",
    creation_date: "1999-03-12",
    admin_status: "Actif",
    headcount: "3 à 5 salariés",
    share_capital: null,
    address: "Maison des associations\n2 bis rue du Clos Perret\n63100 Clermont-Ferrand",
    insee_code: "63113",
    postal_code: "63100",
    department: "Puy-de-Dôme",
    region: "Auvergne-Rhône-Alpes",
  },
  // D5 — centre de soins faune sauvage (association)
  {
    siret: "78616022400031",
    legal_name: "LIGUE POUR LA PROTECTION DES OISEAUX PAYS DE LA LOIRE",
    siren: "786160224",
    legal_form: "Association déclarée",
    naf_code: "94.99Z",
    naf_label: "Autres organisations fonctionnant par adhésion volontaire",
    creation_date: "1985-09-01",
    admin_status: "Actif",
    headcount: "20 à 49 salariés",
    share_capital: null,
    address: "10 rue de l'Église\n44830 Bouaye",
    insee_code: "44023",
    postal_code: "44830",
    department: "Loire-Atlantique",
    region: "Pays de la Loire",
  },
  // D6 — déviation RD 73 (collectivité)
  {
    siret: "22760540400019",
    legal_name: "DEPARTEMENT DE LA SEINE-MARITIME",
    siren: "227605404",
    legal_form: "Département",
    naf_code: "84.11Z",
    naf_label: "Administration publique générale",
    creation_date: "1968-01-09",
    admin_status: "Actif",
    headcount: "5 000 à 9 999 salariés",
    share_capital: null,
    address: "Quai Jean Moulin\nCS 56101\n76101 Rouen Cedex",
    insee_code: "76540",
    postal_code: "76101",
    department: "Seine-Maritime",
    region: "Normandie",
  },
  // D7 — extension carrière (SARL)
  {
    siret: "39284715600014",
    legal_name: "CARRIERES DU NUITON",
    siren: "392847156",
    legal_form: "SARL, société à responsabilité limitée",
    naf_code: "08.11Z",
    naf_label:
      "Extraction de pierres ornementales et de construction, de calcaire industriel, de gypse, de craie et d'ardoise",
    creation_date: "1994-04-22",
    admin_status: "Actif",
    headcount: "10 à 19 salariés",
    share_capital: "150000",
    address: "Route de Chaux\n21700 Nuits-Saint-Georges",
    insee_code: "21458",
    postal_code: "21700",
    department: "Côte-d'Or",
    region: "Bourgogne-Franche-Comté",
  },
  // D8 — réhabilitation clocher (collectivité)
  {
    siret: "21770379200013",
    legal_name: "COMMUNE DE PROVINS",
    siren: "217703792",
    legal_form: "Commune et commune nouvelle",
    naf_code: "84.11Z",
    naf_label: "Administration publique générale",
    creation_date: "1976-01-01",
    admin_status: "Actif",
    headcount: "250 à 499 salariés",
    share_capital: null,
    address: "Place du Maréchal Leclerc\n77160 Provins",
    insee_code: "77379",
    postal_code: "77160",
    department: "Seine-et-Marne",
    region: "Île-de-France",
  },
  // D9 — aménagement des berges du Kourou (collectivité)
  {
    siret: "21973304600011",
    legal_name: "COMMUNE DE KOUROU",
    siren: "219733046",
    legal_form: "Commune et commune nouvelle",
    naf_code: "84.11Z",
    naf_label: "Administration publique générale",
    creation_date: "1969-01-01",
    admin_status: "Actif",
    headcount: "500 à 999 salariés",
    share_capital: null,
    address: "1 avenue de France\n97310 Kourou",
    insee_code: "97304",
    postal_code: "97310",
    department: "Guyane",
    region: "Guyane",
  },
];

// ---------------------------------------------------------------------------
// Personnes (demandeurs personne physique & representatives of personne morale)
// ---------------------------------------------------------------------------

export const SEED_PERSONNES: SeedPersonne[] = [
  // Representative of L'ECHAPPEE BELLE (D10 & D11)
  {
    last_name: "Le Goff",
    first_names: "Katell",
    email: "katell.legoff@echappee-belle.example",
    phone: "02 96 78 12 34",
    role: "Directrice de projet",
  },
  // Personne physique demandeur — D1 (Parc éolien des Monts d'Arrée)
  {
    last_name: "Tanguy",
    first_names: "Yannick",
    email: "yannick.tanguy@example.org",
    address: "3 venelle du Menhir\n29190 Brasparts",
    phone: "06 12 34 56 78",
    role: "Professeur émérite des universités",
  },
  // Mandataire — D1: engineering firm that filed the dossier for Yannick Tanguy
  {
    last_name: "Morvan",
    first_names: "Claire",
    email: "claire.morvan@biotope-ouest.example",
    phone: "02 98 45 67 89",
    role: "Chargée d'études faune-flore",
  },
  // Personne physique demandeur — D2
  {
    last_name: "Rieux",
    first_names: "Soizic",
    email: "soizic.rieux@example.org",
    address: "18 rue de la Fontaine\n35000 Rennes",
    phone: "06 98 76 54 32",
    role: "Écologue indépendante",
  },
  // Personne physique demandeur — D3 (rénovation de façade, Thionville)
  {
    last_name: "Klein",
    first_names: "Hervé",
    email: "herve.klein@example.org",
    address: "24 rue de la Paix\n57100 Thionville",
    phone: "06 45 78 90 12",
    role: "Propriétaire de l'immeuble",
  },
  // Representative of CHAUVE-SOURIS AUVERGNE (D4)
  {
    last_name: "Delattre",
    first_names: "Thomas",
    email: "thomas.delattre@chauve-souris-auvergne.example",
    phone: "04 73 89 13 46",
    role: "Coordinateur scientifique",
  },
  // Representative of LPO PAYS DE LA LOIRE (D5)
  {
    last_name: "Bureau",
    first_names: "Sandrine",
    email: "sandrine.bureau@lpo-paysdelaloire.example",
    phone: "02 51 82 04 90",
    role: "Directrice du centre de soins",
  },
  // Representative of DEPARTEMENT DE LA SEINE-MARITIME (D6)
  {
    last_name: "Vasseur",
    first_names: "Élodie",
    email: "elodie.vasseur@seinemaritime.example",
    phone: "02 35 03 55 00",
    role: "Cheffe du service infrastructures routières",
  },
  // Representative of CARRIERES DU NUITON (D7)
  {
    last_name: "Chevallier",
    first_names: "Bernard",
    email: "bernard.chevallier@carrieres-nuiton.example",
    phone: "03 80 61 12 34",
    role: "Gérant",
  },
  // Mandataire — D7: bureau d'étude that filed the dossier for CARRIERES DU NUITON
  {
    last_name: "Leduc",
    first_names: "Sophie",
    email: "sophie.leduc@gerea-etudes.example",
    phone: "05 56 12 34 56",
    role: "Chargée d'études réglementaires",
  },
  // Representative of COMMUNE DE PROVINS (D8)
  {
    last_name: "Aubry",
    first_names: "Jean-Marc",
    email: "jeanmarc.aubry@mairie-provins.example",
    phone: "01 64 60 20 00",
    role: "Adjoint au maire délégué au patrimoine",
  },
  // Representative of COMMUNE DE KOUROU (D9)
  {
    last_name: "Adélaïde",
    first_names: "Marie-Louise",
    email: "ml.adelaide@ville-kourou.example",
    phone: "05 94 22 30 00",
    role: "Directrice des services techniques",
  },
];

// ---------------------------------------------------------------------------
// Dossiers followed by the dev/seed user (demarche_numerique_number)
// ---------------------------------------------------------------------------

export const SEED_DOSSIERS_SUIVIS_PAR_DEV: string[] = [
  "99000010", // D10 — Aménagement de lotissement
  "99000011", // D11 — Agrandissement pistes cyclables Rennes-Dinan
];

// ---------------------------------------------------------------------------
// Espèces impactées (generated as ODS files at seed time)
// ---------------------------------------------------------------------------

export const SEED_ESPECES_IMPACTEES: SeedEspecesImpactees[] = [
  // D10 — Aménagement de lotissement
  // Hirondelle rousseline (CNPN, oiseau) impacted twice; Grenouille des champs
  // (ministérielle, faune non-oiseau) impacted once.
  {
    dossier: "99000010",
    nom_fichier: "especes-impactees.ods",
    lignes: [
      // Dégradation/destruction d'aires de repos/reproduction (P-4-2)
      {
        classification: "oiseau",
        cd_ref: "459478",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 4000,
      },
      // Destruction de nids/oeufs (P-4-1)
      {
        classification: "oiseau",
        cd_ref: "459478",
        identifiant_pitchou_activité: "P-4-1",
        nombre_nids: 12,
      },
      // Dégradation/destruction d'aires de repos/reproduction, faune non-oiseau (P-60)
      {
        classification: "faune non-oiseau",
        cd_ref: "299",
        identifiant_pitchou_activité: "P-60",
        surface_habitat_détruit: 2000,
      },
    ],
  },
  // D11 — Agrandissement pistes cyclables Rennes-Dinan
  {
    dossier: "99000011",
    nom_fichier: "especes-impactees.ods",
    lignes: [
      // Dégradation/destruction d'aires de repos/reproduction, oiseau (P-4-2)
      {
        classification: "oiseau",
        cd_ref: "4663",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 3000,
      },
      {
        classification: "oiseau",
        cd_ref: "4669",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 3000,
      },
      {
        classification: "oiseau",
        cd_ref: "2666",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 1200,
      },
      {
        classification: "oiseau",
        cd_ref: "4221",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 3000,
      },
      // Dégradation/destruction d'aires de repos/reproduction, faune non-oiseau (P-60)
      {
        classification: "faune non-oiseau",
        cd_ref: "351",
        identifiant_pitchou_activité: "P-60",
        surface_habitat_détruit: 450,
      },
      // Capture/relâcher immédiat, faune non-oiseau (P-30)
      {
        classification: "faune non-oiseau",
        cd_ref: "351",
        identifiant_pitchou_activité: "P-30",
        nombre_individus: "11-100",
      },
      // Peturbation, effarouchement, faune non-oiseau (P-40)
      {
        classification: "faune non-oiseau",
        cd_ref: "77600",
        identifiant_pitchou_activité: "P-40",
        nombre_individus: "0-10",
      },
      // Cueillette, collecte, coupe, déracinement…, flore (P-80)
      {
        classification: "flore",
        cd_ref: "88560",
        identifiant_pitchou_activité: "P-80",
        surface_habitat_détruit: 3500,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Évènements phase dossier
// Each dossier has ≥1 phase event; the last one defines the current phase.
// ---------------------------------------------------------------------------

export const SEED_EVENEMENTS_PHASE_DOSSIER: SeedEvenementPhaseDossier[] = [
  // D1 – éolien Bretagne → Controle
  {
    dossier: "99000001",
    phase: "Accompagnement amont",
    timestamp: new Date("2022-09-14T08:30:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000001",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2023-01-16T09:00:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000001",
    phase: "Instruction",
    timestamp: new Date("2023-03-27T10:00:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000001",
    phase: "Contrôle",
    timestamp: new Date("2023-07-12T14:30:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D2 – photovoltaïque Occitanie → Instruction
  {
    dossier: "99000002",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2024-03-18T10:15:00+00:00"),
    demarche_numerique_agent_email: "jp.moreau@dreal-oc.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000002",
    phase: "Instruction",
    timestamp: new Date("2024-10-07T09:30:00+00:00"),
    demarche_numerique_agent_email: "jp.moreau@dreal-oc.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D3 – hirondelle Grand Est → Controle
  {
    dossier: "99000003",
    phase: "Instruction",
    timestamp: new Date("2024-06-03T07:55:00+00:00"),
    demarche_numerique_agent_email: "isabelle.lefebvre@dreal-ge.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000003",
    phase: "Contrôle",
    timestamp: new Date("2024-09-18T11:00:00+00:00"),
    demarche_numerique_agent_email: "isabelle.lefebvre@dreal-ge.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D4 – chiroptères ARA → Instruction
  {
    dossier: "99000004",
    phase: "Instruction",
    timestamp: new Date("2024-11-07T14:20:00+00:00"),
    demarche_numerique_agent_email: "thomas.girard@dreal-ara.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D5 – centre soins PDL → Accompagnement amont
  {
    dossier: "99000005",
    phase: "Accompagnement amont",
    timestamp: new Date("2025-02-10T09:05:00+00:00"),
    demarche_numerique_agent_email: "stephane.richard@dreal-pdl.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D6 – routier Normandie → Instruction
  {
    dossier: "99000006",
    phase: "Accompagnement amont",
    timestamp: new Date("2023-05-22T13:45:00+00:00"),
    demarche_numerique_agent_email: "elodie.bernard@dreal-normandie.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000006",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2023-09-11T10:00:00+00:00"),
    demarche_numerique_agent_email: "elodie.bernard@dreal-normandie.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000006",
    phase: "Instruction",
    timestamp: new Date("2024-03-04T09:00:00+00:00"),
    demarche_numerique_agent_email: "elodie.bernard@dreal-normandie.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D7 – carrière BFC → Classé sans suite
  {
    dossier: "99000007",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2023-11-28T11:10:00+00:00"),
    demarche_numerique_agent_email: "aurelie.simon@dreal-bfc.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000007",
    phase: "Classé sans suite",
    timestamp: new Date("2024-11-15T10:00:00+00:00"),
    demarche_numerique_agent_email: "aurelie.simon@dreal-bfc.gouv.fr",
    demarche_numerique_motivation:
      "Dossier incomplet. Sans réponse du pétitionnaire après deux relances.",
  },

  // D8 – cigogne IDF → Controle
  {
    dossier: "99000008",
    phase: "Instruction",
    timestamp: new Date("2023-09-11T08:40:00+00:00"),
    demarche_numerique_agent_email: "nicolas.martin@driat-idf.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000008",
    phase: "Contrôle",
    timestamp: new Date("2024-01-22T09:00:00+00:00"),
    demarche_numerique_agent_email: "nicolas.martin@driat-idf.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D9 – hydraulique Guyane → Instruction
  {
    dossier: "99000009",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2024-07-30T15:00:00+00:00"),
    demarche_numerique_agent_email: "audrey.mercier@dgtm-guyane.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000009",
    phase: "Instruction",
    timestamp: new Date("2024-11-20T10:30:00+00:00"),
    demarche_numerique_agent_email: "audrey.mercier@dgtm-guyane.gouv.fr",
    demarche_numerique_motivation: null,
  },

  // D11 – pistes cyclables Rennes-Dinan → Instruction → Controle → Accompagnement amont
  {
    dossier: "99000011",
    phase: "Instruction",
    timestamp: new Date("2026-05-05T10:00:00+00:00"),
    demarche_numerique_agent_email: "camille.rousseau@dev.pitchou.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000011",
    phase: "Contrôle",
    timestamp: new Date("2026-05-05T11:00:00+00:00"),
    demarche_numerique_agent_email: "camille.rousseau@dev.pitchou.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000011",
    phase: "Accompagnement amont",
    timestamp: new Date("2026-05-05T12:00:00+00:00"),
    demarche_numerique_agent_email: "camille.rousseau@dev.pitchou.fr",
    demarche_numerique_motivation: null,
  },
];

// ---------------------------------------------------------------------------
// Avis experts
// D1 (CSRPN), D6 (CNPN en cours sans avis encore)
// ---------------------------------------------------------------------------

export const SEED_AVIS_EXPERTS: SeedAvisExpert[] = [
  // D1 – éolien Bretagne – CSRPN Bretagne favorable sous conditions
  {
    id: "ae000001-0000-4000-a000-000000000001",
    dossier: "99000001",
    expert: "CSRPN",
    saisine_date: new Date("2023-01-30"),
    avis: "Favorable sous conditions",
    avis_date: new Date("2023-03-20"),
  },
  // D6 – routier Normandie – CNPN saisi, avis non encore rendu
  {
    id: "ae000002-0000-4000-a000-000000000002",
    dossier: "99000006",
    expert: "CNPN",
    saisine_date: new Date("2024-06-03"),
    avis: null,
    avis_date: null,
  },
  // D10 – aménagement lotissement – CNPN favorable
  {
    id: "ae000003-0000-4000-a000-000000000003",
    dossier: "99000010",
    expert: "CNPN",
    saisine_date: new Date("2026-05-26"),
    avis: "Favorable",
    avis_date: new Date("2026-05-26"),
    nom_fichier_saisine: "saisine-cnpn-lotissement-ploufragan.pdf",
    nom_fichier_avis: "avis-cnpn-lotissement-ploufragan.pdf",
  },
  // D11 – pistes cyclables Rennes-Dinan – CSRPN favorable, avis non daté
  {
    id: "ae000004-0000-4000-a000-000000000004",
    dossier: "99000011",
    expert: "CSRPN",
    saisine_date: new Date("2026-05-05"),
    avis: "Favorable",
    avis_date: null,
    nom_fichier_saisine: "saisine-csrpn-pistes-cyclables-rennes-dinan.pdf",
    nom_fichier_avis: "avis-csrpn-pistes-cyclables-rennes-dinan.pdf",
  },
];

// ---------------------------------------------------------------------------
// Décisions administratives
// D1 (Arrêté dérogation), D3 (Courrier), D8 (Arrêté dérogation)
// ---------------------------------------------------------------------------

export const SEED_DECISIONS_ADMINISTRATIVES: SeedDecisionAdministrative[] = [
  // D1 – éolien Bretagne – arrêté dérogation préfectoral
  {
    id: "da000001-0000-4000-a000-000000000001",
    dossier: "99000001",
    number: "29-2023-142",
    type: "Arrêté dérogation",
    signature_date: new Date("2023-07-12"),
    obligations_end_date: new Date("2027-12-31"),
  },
  // D3 – hirondelle Grand Est – courrier préfectoral
  {
    id: "da000002-0000-4000-a000-000000000002",
    dossier: "99000003",
    number: null,
    type: "Courrier",
    signature_date: new Date("2024-09-18"),
    obligations_end_date: new Date("2028-04-30"),
  },
  // D8 – cigogne IDF – arrêté dérogation
  {
    id: "da000003-0000-4000-a000-000000000003",
    dossier: "99000008",
    number: "77-2024-008",
    type: "Arrêté dérogation",
    signature_date: new Date("2024-01-20"),
    obligations_end_date: new Date("2027-10-31"),
  },
  // D10 – aménagement lotissement – arrêté dérogation
  {
    id: "da000004-0000-4000-a000-000000000004",
    dossier: "99000010",
    number: "987654321",
    type: "Arrêté dérogation",
    signature_date: new Date("2026-05-26"),
    obligations_end_date: new Date("2076-05-26"),
    nom_fichier: "arrete-derogation-987654321.pdf",
  },
  // D11 – pistes cyclables Rennes-Dinan – arrêté dérogation (sans prescription)
  {
    id: "da000005-0000-4000-a000-000000000005",
    dossier: "99000011",
    number: "987654",
    type: "Arrêté dérogation",
    signature_date: new Date("2026-05-05"),
    obligations_end_date: new Date("2028-08-31"),
    nom_fichier: "arrete-derogation-987654.pdf",
  },
];

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------

export const SEED_PRESCRIPTIONS: SeedPrescription[] = [
  // --- D1 (da000001) — éolien Bretagne ---

  {
    id: "a0000001-0000-4000-a000-000000000001",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2024-05-31"),
    article_number: "Article 4",
    description:
      "Mise en place d'un protocole de suivi de la mortalité par les chiroptères (passage mensuel d'avril à octobre) pendant 3 ans consécutifs à la mise en service.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000002-0000-4000-a000-000000000002",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2024-09-30"),
    article_number: "Article 5",
    description:
      "Bridage nocturne des 5 éoliennes d'avril à octobre entre le coucher et le lever du soleil, dès lors que la température est supérieure à 10°C et la vitesse du vent inférieure à 6 m/s.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000003-0000-4000-a000-000000000003",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2025-03-31"),
    article_number: "Article 6",
    description:
      "Transmission du rapport annuel de suivi chiroptères et avifaune à la DREAL Bretagne, incluant les données brutes de détection acoustique.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000004-0000-4000-a000-000000000004",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2024-03-01"),
    article_number: "Article 7",
    description:
      "Balisage des 3 haies bocagères identifiées comme corridors à chiroptères dans l'emprise chantier, avec mise en exclos sur 5 m de part et d'autre.",
    avoided_surface: 3000,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },

  // --- D3 (da000002) — hirondelle Grand Est ---

  {
    id: "a0000005-0000-4000-a000-000000000005",
    decision_administrative: "da000002-0000-4000-a000-000000000002",
    due_date: new Date("2025-02-28"),
    article_number: null,
    description:
      "Travaux de ravalement réalisés entre le 16/09/2024 et le 28/02/2025, en dehors de la période de reproduction de l'Hirondelle de fenêtre (mars–août).",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000006-0000-4000-a000-000000000006",
    decision_administrative: "da000002-0000-4000-a000-000000000002",
    due_date: new Date("2025-04-01"),
    article_number: null,
    description:
      "Pose de 4 nids artificiels en béton bois de type double-nid sur la façade rénovée, à une hauteur minimale de 4 mètres, avant le retour des hirondelles au printemps.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: 4,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000007-0000-4000-a000-000000000007",
    decision_administrative: "da000002-0000-4000-a000-000000000002",
    due_date: null,
    article_number: null,
    description:
      "Suivi annuel de l'occupation des nids artificiels pendant 3 années consécutives (2025, 2026, 2027) avec transmission d'un compte-rendu illustré à la DREAL Grand Est.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },

  // --- D8 (da000003) — cigogne IDF ---

  {
    id: "a0000008-0000-4000-a000-000000000008",
    decision_administrative: "da000003-0000-4000-a000-000000000003",
    due_date: new Date("2024-02-01"),
    article_number: "Article 3",
    description:
      "Démontage du nid de Cigogne blanche en dehors de la saison de reproduction (avant le 1er février 2024), en présence d'un écologue mandaté.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000009-0000-4000-a000-000000000009",
    decision_administrative: "da000003-0000-4000-a000-000000000003",
    due_date: new Date("2024-03-01"),
    article_number: "Article 3",
    description:
      "Installation de 2 plateformes métalliques de nidification (diamètre 80 cm) sur des supports adaptés à proximité immédiate du clocher, avant le retour des cigognes.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: 2,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000010-0000-4000-a000-000000000010",
    decision_administrative: "da000003-0000-4000-a000-000000000003",
    due_date: null,
    article_number: "Article 4",
    description:
      "Suivi de l'occupation des plateformes de nidification pendant 3 ans (2024, 2025, 2026) avec transmission d'un rapport annuel à la DRIAT IDF précisant le nombre de couples nicheurs et le succès reproducteur.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },

  // --- D10 (da000004) — aménagement lotissement ---

  {
    id: "a0000011-0000-4000-a000-000000000011",
    decision_administrative: "da000004-0000-4000-a000-000000000004",
    due_date: new Date("2076-05-26"),
    article_number: "1",
    description: "refaire des mares",
    avoided_surface: null,
    compensated_surface: 1500,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
];

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

export const SEED_CONTROLES: SeedControle[] = [
  // --- D1 prescriptions (a0000001–a0000004) ---

  {
    id: "c0000001-0000-4000-a000-000000000001",
    prescription: "a0000001-0000-4000-a000-000000000001",
    controle_date: new Date("2024-12-10T00:00:00+00:00"),
    result: "Conforme",
    comment:
      "Protocole de suivi chiroptères mis en œuvre dès la mise en service. Premier rapport annuel transmis le 28/11/2024, conforme aux prescriptions.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: new Date("2025-12-10"),
  },
  {
    id: "c0000002-0000-4000-a000-000000000002",
    prescription: "a0000002-0000-4000-a000-000000000002",
    controle_date: new Date("2024-07-18T00:00:00+00:00"),
    result: "Non conforme",
    comment:
      "Le système de bridage présente des dysfonctionnements sur 2 éoliennes (E2 et E4) depuis juin 2024. Exploitant informé par mail.",
    post_controle_action_type: "Email",
    post_controle_action_date: new Date("2024-07-18"),
    next_due_date: new Date("2024-10-15"),
  },
  {
    id: "c0000003-0000-4000-a000-000000000003",
    prescription: "a0000004-0000-4000-a000-000000000004",
    controle_date: new Date("2024-03-25T00:00:00+00:00"),
    result: "Conforme",
    comment: "Balisage en place sur les 3 haies identifiées. Exclos correctement matérialisés.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: null,
  },

  // --- D3 prescriptions (a0000005–a0000007) ---

  {
    id: "c0000004-0000-4000-a000-000000000004",
    prescription: "a0000006-0000-4000-a000-000000000006",
    controle_date: new Date("2025-04-22T00:00:00+00:00"),
    result: "Conforme",
    comment: "4 nids artificiels posés en béton bois, bien orientés, à 4,2 m de hauteur.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: new Date("2026-04-30"),
  },
  {
    id: "c0000005-0000-4000-a000-000000000005",
    prescription: "a0000007-0000-4000-a000-000000000007",
    controle_date: new Date("2025-09-15T00:00:00+00:00"),
    result: "Non conforme",
    comment:
      "Compte-rendu de suivi 2025 non transmis à la date attendue (31/07/2025). Relance adressée.",
    post_controle_action_type: "Email",
    post_controle_action_date: new Date("2025-09-15"),
    next_due_date: new Date("2025-10-31"),
  },

  // --- D8 prescriptions (a0000008–a0000010) ---

  {
    id: "c0000006-0000-4000-a000-000000000006",
    prescription: "a0000008-0000-4000-a000-000000000008",
    controle_date: new Date("2024-02-07T00:00:00+00:00"),
    result: "Conforme",
    comment:
      "Démontage du nid réalisé le 31/01/2024 en présence de Mme Hélène Gardet (écologue). Aucun individu présent lors de l'opération.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: null,
  },
  {
    id: "c0000007-0000-4000-a000-000000000007",
    prescription: "a0000009-0000-4000-a000-000000000009",
    controle_date: new Date("2024-03-12T00:00:00+00:00"),
    result: "Conforme",
    comment:
      "2 plateformes installées le 22/02/2024 sur mâts télescopiques à 7 m de hauteur. Photos transmises.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: new Date("2025-05-31"),
  },
  {
    id: "c0000008-0000-4000-a000-000000000008",
    prescription: "a0000010-0000-4000-a000-000000000010",
    controle_date: new Date("2025-07-14T00:00:00+00:00"),
    result: "Non conforme",
    comment:
      "Rapport de suivi 2024 non transmis malgré relance. Aucun couple nicheur observé sur les 2 plateformes en 2024 (probablement dû à la perturbation des travaux adjacents).",
    post_controle_action_type: "Email",
    post_controle_action_date: new Date("2025-07-14"),
    next_due_date: new Date("2025-09-30"),
  },

  // --- D10 prescription (a0000011) ---

  {
    id: "c0000009-0000-4000-a000-000000000009",
    prescription: "a0000011-0000-4000-a000-000000000011",
    controle_date: new Date("2036-05-26T00:00:00+00:00"),
    result: "Non conforme",
    comment: "c'est pas bien il n'y a pas de mare",
    post_controle_action_type: "rappel qu'il faut en faire une",
    post_controle_action_date: new Date("2036-11-26"),
    next_due_date: new Date("2045-05-26"),
  },
];
