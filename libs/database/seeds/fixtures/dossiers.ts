/**
 * Synthetic seed data for 9 realistic dossiers and their related entities.
 *
 * Dossier IDs: 9000001–9000009 (dev-only range, must not overlap production)
 * DS numbers:  99000001–99000009
 *
 * Each dossier is assigned to a groupe_instructeur matching its department/region.
 * groupe_instructeur is NOT a column on the dossier table — it is used by the seed
 * to populate arête_groupe_instructeurs__dossier.
 */

import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DCisionAdministrativeInitializer } from "@pitchou/types/database/public/DécisionAdministrative.ts";
import type { PrescriptionInitializer } from "@pitchou/types/database/public/Prescription.ts";
import type { ContrLeInitializer } from "@pitchou/types/database/public/Contrôle.ts";
import type { VNementPhaseDossierInitializer } from "@pitchou/types/database/public/ÉvènementPhaseDossier.ts";

// ---------------------------------------------------------------------------
// Seed-specific types
// Branded FK fields (DossierId, PersonneId…) and file refs are replaced with
// plain primitives since seed data is inserted before those FKs are resolved.
// groupe_instructeur is extra metadata used to populate the junction table.
// ---------------------------------------------------------------------------

type SeedDossier = Omit<
  DossierInitializer,
  | "id"
  | "id_demarches_simplifiées"
  | "déposant"
  | "demandeur_personne_physique"
  | "demandeur_personne_morale"
  | "espèces_impactées"
> & {
  id: number;
  groupe_instructeur: string;
};

type SeedAvisExpert = Omit<
  AvisExpertInitializer,
  "id" | "dossier" | "saisine_fichier" | "avis_fichier"
> & {
  id: string;
  dossier: number;
};

type SeedÉvènementPhaseDossier = Omit<
  VNementPhaseDossierInitializer,
  "dossier" | "cause_personne"
> & {
  dossier: number;
};

type SeedDécisionAdministrative = Omit<
  DCisionAdministrativeInitializer,
  "id" | "dossier" | "fichier"
> & {
  id: string;
  dossier: number;
};

type SeedPrescription = Omit<PrescriptionInitializer, "id" | "décision_administrative"> & {
  id: string;
  décision_administrative: string;
};

type SeedContrôle = Omit<ContrLeInitializer, "id" | "prescription"> & {
  id: string;
  prescription: string;
};

// ---------------------------------------------------------------------------
// Dossiers
// ---------------------------------------------------------------------------

export const SEED_DOSSIERS: SeedDossier[] = [
  // -------------------------------------------------------------------------
  // D1 — Parc éolien des Monts d'Arrée – DREAL BRETAGNE
  // Phase actuelle : Contrôle (décision signée, prescriptions en cours)
  // -------------------------------------------------------------------------
  {
    id: 9000001,
    number_demarches_simplifiées: "99000001",
    groupe_instructeur: "DREAL BRETAGNE",
    date_dépôt: new Date("2022-09-14T08:30:00+00:00"),
    départements: ["29"],
    communes: [
      { name: "Brasparts", code: "29015", postalCode: "29190" },
      { name: "Saint-Rivoal", code: "29263", postalCode: "29190" },
    ],
    régions: ["Bretagne"],
    nom: "Parc éolien des Monts d'Arrée – Brasparts et Saint-Rivoal (29)",
    ddep_nécessaire: true,
    commentaire_libre:
      "Dossier complet déposé en septembre 2022. Avis CSRPN favorable sous conditions rendu en mars 2023. Arrêté préfectoral signé le 12/07/2023. Suivi chiroptères en cours – premier rapport transmis conforme.",
    historique_date_envoi_dernière_contribution: new Date("2022-11-02"),
    historique_identifiant_demande_onagre: "2022-09-14d-00291",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: true,
    prochaine_action_attendue_par: "Pétitionnaire",
    activité_principale: "Production énergie renouvelable - Éolien",
    description:
      "Projet de construction d'un parc éolien de 5 machines sur les communes de Brasparts et Saint-Rivoal, dans le massif des Monts d'Arrée. Le site est situé à proximité du Parc Naturel Régional d'Armorique et présente des enjeux importants pour les chiroptères (Grand rhinolophe, Murin de Bechstein) et l'avifaune (Milan royal, Busard Saint-Martin).",
    date_début_intervention: new Date("2023-03-01"),
    date_fin_intervention: new Date("2026-12-31"),
    durée_intervention: 3,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention: null,
    scientifique_intervenants: null,
    scientifique_précisions_autres_intervenants: null,
    scientifique_bilan_antérieur: null,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante:
      "Plusieurs variantes d'implantation ont été étudiées. La variante retenue est celle minimisant les impacts sur les habitats de chiroptères identifiés lors des inventaires naturalistes. Les zones boisées et les corridors écologiques majeurs ont été exclus de l'implantation.",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    justification_motif_dérogation:
      "Le projet contribue à l'atteinte des objectifs nationaux de production d'énergie renouvelable fixés par la loi de programmation énergie-climat et participe à la réduction des émissions de gaz à effet de serre.",
    mesures_erc_prévues: true,
    nombre_nids_détruits_dossier_oiseau_simple: null,
    nombre_nids_compensés_dossier_oiseau_simple: null,
    type: null,
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: false,
    enjeu: true,
  },

  // -------------------------------------------------------------------------
  // D2 — Centrale photovoltaïque La Gardiole – DREAL Occitanie
  // Phase actuelle : Instruction
  // -------------------------------------------------------------------------
  {
    id: 9000002,
    number_demarches_simplifiées: "99000002",
    groupe_instructeur: "DREAL Occitanie",
    date_dépôt: new Date("2024-03-18T10:15:00+00:00"),
    départements: ["34"],
    communes: [{ name: "Montagnac", code: "34163", postalCode: "34530" }],
    régions: ["Occitanie"],
    nom: "Centrale photovoltaïque au sol La Gardiole – Montagnac (34)",
    ddep_nécessaire: true,
    commentaire_libre:
      "Dossier reçu le 18/03/2024. Demande de compléments transmise le 05/06/2024 concernant le protocole de suivi des reptiles. Réponse reçue le 22/09/2024. Instruction en cours.\n- 18/03/2024 : dépôt du dossier\n- 05/06/2024 : demande de compléments (suivi reptiles)\n- 22/09/2024 : réception des compléments",
    historique_date_envoi_dernière_contribution: new Date("2024-09-22"),
    historique_identifiant_demande_onagre: "",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: true,
    prochaine_action_attendue_par: "Instructeur",
    activité_principale: "Production énergie renouvelable - Photovoltaïque",
    description:
      "Projet de centrale photovoltaïque au sol d'une puissance installée de 12 MWc sur des parcelles de garrigue et friches agricoles sur la commune de Montagnac. La surface clôturée sera de 18 hectares. Des inventaires naturalistes ont mis en évidence la présence de la Couleuvre de Montpellier, du Lézard ocellé et de l'Outarde canepetière.",
    date_début_intervention: new Date("2025-09-01"),
    date_fin_intervention: new Date("2055-09-01"),
    durée_intervention: 30,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention: null,
    scientifique_intervenants: null,
    scientifique_précisions_autres_intervenants: null,
    scientifique_bilan_antérieur: null,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante:
      "Le site retenu est constitué de friches agricoles et de garrigue dégradée, sans enjeu agricole. Plusieurs variantes d'implantation ont été étudiées permettant d'éviter les secteurs à plus forte densité de reptiles et les zones de nidification connues de l'Outarde canepetière.",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    justification_motif_dérogation:
      "Le projet s'inscrit dans le cadre du Plan de Relance national et contribue à la souveraineté énergétique française en produisant de l'énergie décarbonée.",
    mesures_erc_prévues: true,
    nombre_nids_détruits_dossier_oiseau_simple: null,
    nombre_nids_compensés_dossier_oiseau_simple: null,
    type: null,
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: false,
    enjeu: false,
  },

  // -------------------------------------------------------------------------
  // D3 — Rénovation immeuble – Hirondelles – DREAL Grand Est
  // Phase actuelle : Contrôle
  // -------------------------------------------------------------------------
  {
    id: 9000003,
    number_demarches_simplifiées: "99000003",
    groupe_instructeur: "DREAL Grand Est",
    date_dépôt: new Date("2024-06-03T07:55:00+00:00"),
    départements: ["57"],
    communes: [{ name: "Thionville", code: "57672", postalCode: "57100" }],
    régions: ["Grand Est"],
    nom: "Rénovation de façade – nids d'hirondelles – Thionville (57)",
    ddep_nécessaire: null,
    commentaire_libre:
      "ERsuf signé le 03/06/2024. Courrier préfectoral transmis le 18/09/2024. Suivi 2025 réalisé – nids artificiels posés conformément.",
    historique_date_envoi_dernière_contribution: null,
    historique_identifiant_demande_onagre: "",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Instructeur",
    activité_principale:
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d'art",
    description:
      "Ravalement de façade d'un immeuble résidentiel de 6 étages rue de la Paix à Thionville. La façade accueille 2 nids actifs d'Hirondelle de fenêtre (Delichon urbicum). Les travaux sont prévus en dehors de la période de reproduction.",
    date_début_intervention: new Date("2024-09-16"),
    date_fin_intervention: new Date("2025-02-28"),
    durée_intervention: 0,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention: null,
    scientifique_intervenants: null,
    scientifique_précisions_autres_intervenants: null,
    scientifique_bilan_antérieur: null,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante:
      "Le ravalement est impératif pour des raisons de sécurité publique (risque de chute d'enduit). Un report après la saison de reproduction 2025 est impossible car le bâtiment est classé dangereux.",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    justification_motif_dérogation: "",
    mesures_erc_prévues: true,
    nombre_nids_détruits_dossier_oiseau_simple: 2,
    nombre_nids_compensés_dossier_oiseau_simple: 4,
    type: "Hirondelle",
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: false,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: false,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: false,
    enjeu: false,
  },

  // -------------------------------------------------------------------------
  // D4 — Suivi chiroptères cavernicoles – DREAL Auvergne-Rhône-Alpes
  // Phase actuelle : Instruction
  // -------------------------------------------------------------------------
  {
    id: 9000004,
    number_demarches_simplifiées: "99000004",
    groupe_instructeur: "DREAL Auvergne-Rhône-Alpes",
    date_dépôt: new Date("2024-11-07T14:20:00+00:00"),
    départements: ["63"],
    communes: [
      { name: "Issoire", code: "63178", postalCode: "63500" },
      { name: "Vic-le-Comte", code: "63458", postalCode: "63270" },
    ],
    régions: ["Auvergne-Rhône-Alpes"],
    nom: "Inventaire chiroptères cavernicoles – réseau de grottes du Puy-de-Dôme",
    ddep_nécessaire: true,
    commentaire_libre:
      "Dossier scientifique complet. En cours d'instruction. Protocole conforme aux recommandations du MNHN.",
    historique_date_envoi_dernière_contribution: null,
    historique_identifiant_demande_onagre: "2024-11-00291-001-001",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Instructeur",
    activité_principale: "Demande à caractère scientifique",
    description:
      "Dans le cadre de la mise à jour de l'Atlas des chauves-souris du Puy-de-Dôme, l'association Chauve-Souris Auvergne souhaite réaliser des inventaires dans un réseau de 14 cavités naturelles et ouvrages souterrains. L'objectif est de mettre à jour les données de présence et d'abondance pour six espèces cavernicoles prioritaires : Grand rhinolophe, Petit rhinolophe, Grand murin, Murin de Bechstein, Vespertilion à oreilles échancrées et Minioptère de Schreibers.",
    date_début_intervention: new Date("2025-10-01"),
    date_fin_intervention: new Date("2028-04-30"),
    durée_intervention: null,
    scientifique_type_demande: [
      "Une/des capture(s)/relâcher(s) immédiat(s) sur place sans marquage",
    ],
    scientifique_description_protocole_suivi:
      "Protocole standardisé de comptage hivernal (méthode ICA) combinant observation visuelle et enregistrement acoustique à l'entrée des cavités. Une session de capture au filet japonais sera réalisée à l'entrée de 3 sites sélectionnés pour confirmation d'espèces difficiles à identifier acoustiquement. Capture et relâcher immédiat, sans baguage.",
    scientifique_mode_capture: ["Avec filet japonais"],
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention:
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
    scientifique_précisions_autres_intervenants:
      "Les bénévoles présents lors des inventaires n'effectueront pas de manipulations directes sur les individus.",
    scientifique_bilan_antérieur: true,
    scientifique_finalité_demande: [
      "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'élaboration ou du suivi de plans, de schémas, de programmes ou d'autres documents de planification nécessitant l'acquisition de connaissances ou visant à la préservation du patrimoine naturel prévus par des dispositions du code de l'environnement.",
    ],
    justification_absence_autre_solution_satisfaisante:
      "L'identification certaine de certaines espèces du genre Myotis nécessite l'examen morphologique en main. La seule écoute passive ne permet pas une identification fiable sans risque de confusion.",
    motif_dérogation: "A des fins de recherche et d'enseignement",
    justification_motif_dérogation:
      "Le programme s'intègre dans le Plan National d'Actions en faveur des chauves-souris (PNA 2021-2030). Les données collectées alimenteront directement l'observatoire national des chiroptères.",
    mesures_erc_prévues: false,
    nombre_nids_détruits_dossier_oiseau_simple: null,
    nombre_nids_compensés_dossier_oiseau_simple: null,
    type: null,
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: null,
    presence_especes_dans_aire_influence: null,
    risque_malgre_mesures_erc: null,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: null,
    enjeu: false,
  },

  // -------------------------------------------------------------------------
  // D5 — Centre de soins faune sauvage – DREAL Pays de la loire
  // Phase actuelle : Accompagnement amont
  // -------------------------------------------------------------------------
  {
    id: 9000005,
    number_demarches_simplifiées: "99000005",
    groupe_instructeur: "DREAL Pays de la loire",
    date_dépôt: new Date("2025-02-10T09:05:00+00:00"),
    départements: ["44", "49", "53", "72", "85"],
    communes: null,
    régions: ["Pays-de-la-Loire"],
    nom: "Transport et relâcher d'espèces protégées – Centre de soins LPO Pays de la Loire",
    ddep_nécessaire: false,
    commentaire_libre:
      "Dossier incomplet à réception. Courrier de demande de compléments envoyé le 14/03/2025. En attente de réponse du pétitionnaire.",
    historique_date_envoi_dernière_contribution: null,
    historique_identifiant_demande_onagre: "",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Pétitionnaire",
    activité_principale: "Conservation des espèces",
    description:
      "Le centre de soins pour la faune sauvage géré par la LPO Pays de la Loire (Nantes, 44) accueille annuellement plusieurs centaines d'animaux sauvages protégés blessés ou en détresse. La dérogation demandée concerne le transport de spécimens d'espèces protégées depuis leur lieu de découverte jusqu'au centre de soins, et leur relâcher ultérieur dans leur milieu naturel après rétablissement.",
    date_début_intervention: new Date("2026-01-01"),
    date_fin_intervention: new Date("2030-12-31"),
    durée_intervention: 5,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport:
      "Transport en caisses de contention adaptées à chaque espèce, selon les protocoles vétérinaires en vigueur.",
    scientifique_périmètre_intervention:
      "Ensemble du territoire des cinq départements de la région Pays de la Loire.",
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
    scientifique_précisions_autres_intervenants:
      "Les bénévoles transporteurs sont formés à la contention sécurisée des animaux sauvages.",
    scientifique_bilan_antérieur: true,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante:
      "Le transport est indispensable au fonctionnement du centre de soins. Aucune alternative ne permet de soigner des animaux blessés sans les déplacer.",
    motif_dérogation: "Conservation des espèces",
    justification_motif_dérogation: "",
    mesures_erc_prévues: false,
    nombre_nids_détruits_dossier_oiseau_simple: null,
    nombre_nids_compensés_dossier_oiseau_simple: null,
    type: null,
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: null,
    presence_especes_dans_aire_influence: null,
    risque_malgre_mesures_erc: null,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: null,
    enjeu: false,
  },

  // -------------------------------------------------------------------------
  // D6 — Déviation de la RD 73 – DREAL Normandie
  // Phase actuelle : Instruction (en attente avis CNPN)
  // -------------------------------------------------------------------------
  {
    id: 9000006,
    number_demarches_simplifiées: "99000006",
    groupe_instructeur: "DREAL Normandie",
    date_dépôt: new Date("2023-05-22T13:45:00+00:00"),
    départements: ["76"],
    communes: [
      { name: "Yvetot", code: "76759", postalCode: "76190" },
      { name: "Valliquerville", code: "76726", postalCode: "76190" },
    ],
    régions: ["Normandie"],
    nom: "Déviation de la RD 73 – Yvetot / Valliquerville (76)",
    ddep_nécessaire: true,
    commentaire_libre:
      "Dossier reçu le 22/05/2023. Rattaché à l'AE instruite par la préfecture de Seine-Maritime.\n- 22/05/2023 : dépôt du dossier\n- 08/09/2023 : demande de compléments (impact zone humide)\n- 14/02/2024 : réception compléments\n- 03/06/2024 : saisine CNPN\n- En attente avis CNPN",
    historique_date_envoi_dernière_contribution: new Date("2024-02-14"),
    historique_identifiant_demande_onagre: "2023-05-00076-001-002",
    date_debut_consultation_public: new Date("2023-10-16"),
    rattaché_au_régime_ae: true,
    prochaine_action_attendue_par: "CNPN/CSRPN",
    activité_principale: "Infrastructures de transport routières",
    description:
      "Création d'une déviation de 3,4 km de la route départementale 73 au sud d'Yvetot, afin de délester le centre-bourg du trafic de transit. Le tracé traverse une zone bocagère présentant des enjeux pour le Triton crêté, la Rainette verte, plusieurs espèces de chiroptères et le Murin de Bechstein. Une zone humide de 2,4 ha sera impactée de manière résiduelle malgré les mesures d'évitement.",
    date_début_intervention: new Date("2025-03-01"),
    date_fin_intervention: new Date("2027-06-30"),
    durée_intervention: 2,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention: null,
    scientifique_intervenants: null,
    scientifique_précisions_autres_intervenants: null,
    scientifique_bilan_antérieur: null,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante:
      "Quatre variantes de tracé ont été comparées. La variante retenue est celle présentant le moindre impact sur les zones à enjeux écologiques forts, notamment les corridors boisés et les mares à Triton crêté. Un tracé plus au nord présentait des impacts beaucoup plus importants sur des boisements anciens.",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    justification_motif_dérogation:
      "La déviation répond à un enjeu de sécurité routière (route accidentogène traversant une zone scolaire) et de qualité de vie des riverains du centre-bourg d'Yvetot.",
    mesures_erc_prévues: true,
    nombre_nids_détruits_dossier_oiseau_simple: null,
    nombre_nids_compensés_dossier_oiseau_simple: null,
    type: null,
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    date_fin_consultation_public: new Date("2023-11-17"),
    mesures_er_suffisantes: false,
    enjeu: true,
  },

  // -------------------------------------------------------------------------
  // D7 — Extension carrière de calcaire – DREAL BFC
  // Phase actuelle : Classé sans suite
  // -------------------------------------------------------------------------
  {
    id: 9000007,
    number_demarches_simplifiées: "99000007",
    groupe_instructeur: "DREAL BFC",
    date_dépôt: new Date("2023-11-28T11:10:00+00:00"),
    départements: ["21"],
    communes: [{ name: "Nuits-Saint-Georges", code: "21458", postalCode: "21700" }],
    régions: ["Bourgogne-Franche-Comté"],
    nom: "Extension de la carrière de calcaire de Chaux – Nuits-Saint-Georges (21)",
    ddep_nécessaire: true,
    commentaire_libre:
      "Dossier reçu le 28/11/2023. Demande de compléments envoyée le 15/02/2024 (absence d'inventaire chiroptères hivernal). Relance adressée le 18/06/2024. Sans réponse du pétitionnaire. Dossier classé sans suite le 15/11/2024 pour non-réponse dans le délai imparti.",
    historique_date_envoi_dernière_contribution: null,
    historique_identifiant_demande_onagre: "",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: null,
    activité_principale: "Carrières",
    description:
      "Extension d'une carrière de calcaire existante vers le nord sur 8 hectares supplémentaires. Les inventaires naturalistes révèlent la présence de pelouses calcicoles abritant plusieurs espèces d'orchidées protégées et un habitat favorable pour le Lézard des souches et le Grand rhinolophe.",
    date_début_intervention: null,
    date_fin_intervention: null,
    durée_intervention: null,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention: null,
    scientifique_intervenants: null,
    scientifique_précisions_autres_intervenants: null,
    scientifique_bilan_antérieur: null,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante: "",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    justification_motif_dérogation: "",
    mesures_erc_prévues: null,
    nombre_nids_détruits_dossier_oiseau_simple: null,
    nombre_nids_compensés_dossier_oiseau_simple: null,
    type: null,
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: false,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: null,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: null,
    enjeu: false,
  },

  // -------------------------------------------------------------------------
  // D8 — Réhabilitation clocher – Cigognes – DRIAT IDF
  // Phase actuelle : Contrôle
  // -------------------------------------------------------------------------
  {
    id: 9000008,
    number_demarches_simplifiées: "99000008",
    groupe_instructeur: "DRIAT IDF",
    date_dépôt: new Date("2023-09-11T08:40:00+00:00"),
    départements: ["77"],
    communes: [{ name: "Provins", code: "77379", postalCode: "77160" }],
    régions: ["Île-de-France"],
    nom: "Réhabilitation du clocher de l'église Saint-Quiriace – nid de cigognes – Provins (77)",
    ddep_nécessaire: null,
    commentaire_libre:
      "ERsuf signé le 11/09/2023. Arrêté préfectoral signé le 20/01/2024. Plateforme de nidification posée – conforme. Suivi 2024 : couple non revenu sur le site.",
    historique_date_envoi_dernière_contribution: null,
    historique_identifiant_demande_onagre: "",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Instructeur",
    activité_principale:
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d'art",
    description:
      "Réfection de la toiture et du campanile de l'église Saint-Quiriace à Provins, classée monument historique. Le nid actif d'une cigogne blanche (Ciconia ciconia) devra être temporairement déplacé pour permettre l'accès aux maçons. Une plateforme métallique de substitution sera installée à proximité immédiate.",
    date_début_intervention: new Date("2024-02-01"),
    date_fin_intervention: new Date("2024-10-31"),
    durée_intervention: 0,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention: null,
    scientifique_intervenants: null,
    scientifique_précisions_autres_intervenants: null,
    scientifique_bilan_antérieur: null,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante:
      "Les travaux de réfection de la toiture sont impératifs pour assurer la pérennité du monument historique et la sécurité des visiteurs. Un report est impossible, l'état de la charpente étant dégradé.",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    justification_motif_dérogation: "",
    mesures_erc_prévues: true,
    nombre_nids_détruits_dossier_oiseau_simple: 1,
    nombre_nids_compensés_dossier_oiseau_simple: 2,
    type: "Cigogne",
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: false,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: false,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: false,
    enjeu: false,
  },

  // -------------------------------------------------------------------------
  // D9 — Aménagement des berges du Kourou – DGTM Guyane
  // Phase actuelle : Instruction
  // -------------------------------------------------------------------------
  {
    id: 9000009,
    number_demarches_simplifiées: "99000009",
    groupe_instructeur: "DGTM Guyane",
    date_dépôt: new Date("2024-07-30T15:00:00+00:00"),
    départements: ["973"],
    communes: [{ name: "Kourou", code: "97304", postalCode: "97310" }],
    régions: ["Guyane"],
    nom: "Aménagement des berges du Kourou – protection contre les crues – Kourou (973)",
    ddep_nécessaire: true,
    commentaire_libre:
      "Dossier en cours d'instruction. Enjeux importants liés à la présence du Caïman noir et de tortues aquatiques protégées. Demande de compléments en cours de rédaction.",
    historique_date_envoi_dernière_contribution: new Date("2024-10-15"),
    historique_identifiant_demande_onagre: "",
    date_debut_consultation_public: null,
    rattaché_au_régime_ae: true,
    prochaine_action_attendue_par: "Instructeur",
    activité_principale: "Projets liés à la gestion de l'eau",
    description:
      "Travaux de protection des berges du fleuve Kourou contre les crues et l'érosion, sur une linéaire de 1,2 km en aval de la ville. Le projet prévoit la mise en place d'enrochements et d'épis hydrauliques. Les inventaires identifient la présence du Caïman noir (Melanosuchus niger), du Caïman à lunettes (Caiman crocodilus), de la Tortue-matamata (Chelus fimbriatus) et de plusieurs espèces de poissons protégés.",
    date_début_intervention: new Date("2026-02-01"),
    date_fin_intervention: new Date("2026-09-30"),
    durée_intervention: 0,
    scientifique_type_demande: null,
    scientifique_description_protocole_suivi: null,
    scientifique_mode_capture: null,
    scientifique_modalités_source_lumineuses: null,
    scientifique_modalités_marquage: null,
    scientifique_modalités_transport: null,
    scientifique_périmètre_intervention: null,
    scientifique_intervenants: null,
    scientifique_précisions_autres_intervenants: null,
    scientifique_bilan_antérieur: null,
    scientifique_finalité_demande: null,
    justification_absence_autre_solution_satisfaisante:
      "Les travaux sont localisés dans un secteur où les berges sont en cours d'effondrement, menaçant des habitations et infrastructures. Un déplacement du linéaire de travaux vers l'amont réduirait l'efficacité hydraulique de la protection.",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    justification_motif_dérogation:
      "La protection contre les crues garantit la sécurité des populations riveraines et des installations du Centre Spatial Guyanais.",
    mesures_erc_prévues: true,
    nombre_nids_détruits_dossier_oiseau_simple: null,
    nombre_nids_compensés_dossier_oiseau_simple: null,
    type: null,
    numéro_démarche: 88444,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    date_fin_consultation_public: null,
    mesures_er_suffisantes: false,
    enjeu: true,
  },
];

// ---------------------------------------------------------------------------
// Évènements phase dossier
// Each dossier has ≥1 phase event; the last one defines the current phase.
// ---------------------------------------------------------------------------

export const SEED_ÉVÈNEMENTS_PHASE_DOSSIER: SeedÉvènementPhaseDossier[] = [
  // D1 – éolien Bretagne → Contrôle
  {
    dossier: 9000001,
    phase: "Accompagnement amont",
    horodatage: new Date("2022-09-14T08:30:00+00:00"),
    DS_emailAgentTraitant: "claire.morin@dreal-bretagne.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000001,
    phase: "Étude recevabilité DDEP",
    horodatage: new Date("2023-01-16T09:00:00+00:00"),
    DS_emailAgentTraitant: "claire.morin@dreal-bretagne.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000001,
    phase: "Instruction",
    horodatage: new Date("2023-03-27T10:00:00+00:00"),
    DS_emailAgentTraitant: "claire.morin@dreal-bretagne.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000001,
    phase: "Contrôle",
    horodatage: new Date("2023-07-12T14:30:00+00:00"),
    DS_emailAgentTraitant: "claire.morin@dreal-bretagne.gouv.fr",
    DS_motivation: null,
  },

  // D2 – photovoltaïque Occitanie → Instruction
  {
    dossier: 9000002,
    phase: "Étude recevabilité DDEP",
    horodatage: new Date("2024-03-18T10:15:00+00:00"),
    DS_emailAgentTraitant: "jp.moreau@dreal-oc.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000002,
    phase: "Instruction",
    horodatage: new Date("2024-10-07T09:30:00+00:00"),
    DS_emailAgentTraitant: "jp.moreau@dreal-oc.gouv.fr",
    DS_motivation: null,
  },

  // D3 – hirondelle Grand Est → Contrôle
  {
    dossier: 9000003,
    phase: "Instruction",
    horodatage: new Date("2024-06-03T07:55:00+00:00"),
    DS_emailAgentTraitant: "isabelle.lefebvre@dreal-ge.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000003,
    phase: "Contrôle",
    horodatage: new Date("2024-09-18T11:00:00+00:00"),
    DS_emailAgentTraitant: "isabelle.lefebvre@dreal-ge.gouv.fr",
    DS_motivation: null,
  },

  // D4 – chiroptères ARA → Instruction
  {
    dossier: 9000004,
    phase: "Instruction",
    horodatage: new Date("2024-11-07T14:20:00+00:00"),
    DS_emailAgentTraitant: "thomas.girard@dreal-ara.gouv.fr",
    DS_motivation: null,
  },

  // D5 – centre soins PDL → Accompagnement amont
  {
    dossier: 9000005,
    phase: "Accompagnement amont",
    horodatage: new Date("2025-02-10T09:05:00+00:00"),
    DS_emailAgentTraitant: "stephane.richard@dreal-pdl.gouv.fr",
    DS_motivation: null,
  },

  // D6 – routier Normandie → Instruction
  {
    dossier: 9000006,
    phase: "Accompagnement amont",
    horodatage: new Date("2023-05-22T13:45:00+00:00"),
    DS_emailAgentTraitant: "elodie.bernard@dreal-normandie.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000006,
    phase: "Étude recevabilité DDEP",
    horodatage: new Date("2023-09-11T10:00:00+00:00"),
    DS_emailAgentTraitant: "elodie.bernard@dreal-normandie.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000006,
    phase: "Instruction",
    horodatage: new Date("2024-03-04T09:00:00+00:00"),
    DS_emailAgentTraitant: "elodie.bernard@dreal-normandie.gouv.fr",
    DS_motivation: null,
  },

  // D7 – carrière BFC → Classé sans suite
  {
    dossier: 9000007,
    phase: "Étude recevabilité DDEP",
    horodatage: new Date("2023-11-28T11:10:00+00:00"),
    DS_emailAgentTraitant: "aurelie.simon@dreal-bfc.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000007,
    phase: "Classé sans suite",
    horodatage: new Date("2024-11-15T10:00:00+00:00"),
    DS_emailAgentTraitant: "aurelie.simon@dreal-bfc.gouv.fr",
    DS_motivation: "Dossier incomplet. Sans réponse du pétitionnaire après deux relances.",
  },

  // D8 – cigogne IDF → Contrôle
  {
    dossier: 9000008,
    phase: "Instruction",
    horodatage: new Date("2023-09-11T08:40:00+00:00"),
    DS_emailAgentTraitant: "nicolas.martin@driat-idf.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000008,
    phase: "Contrôle",
    horodatage: new Date("2024-01-22T09:00:00+00:00"),
    DS_emailAgentTraitant: "nicolas.martin@driat-idf.gouv.fr",
    DS_motivation: null,
  },

  // D9 – hydraulique Guyane → Instruction
  {
    dossier: 9000009,
    phase: "Étude recevabilité DDEP",
    horodatage: new Date("2024-07-30T15:00:00+00:00"),
    DS_emailAgentTraitant: "audrey.mercier@dgtm-guyane.gouv.fr",
    DS_motivation: null,
  },
  {
    dossier: 9000009,
    phase: "Instruction",
    horodatage: new Date("2024-11-20T10:30:00+00:00"),
    DS_emailAgentTraitant: "audrey.mercier@dgtm-guyane.gouv.fr",
    DS_motivation: null,
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
    dossier: 9000001,
    expert: "CSRPN",
    date_saisine: new Date("2023-01-30"),
    avis: "Favorable sous conditions",
    date_avis: new Date("2023-03-20"),
  },
  // D6 – routier Normandie – CNPN saisi, avis non encore rendu
  {
    id: "ae000002-0000-4000-a000-000000000002",
    dossier: 9000006,
    expert: "CNPN",
    date_saisine: new Date("2024-06-03"),
    avis: null,
    date_avis: null,
  },
];

// ---------------------------------------------------------------------------
// Décisions administratives
// D1 (Arrêté dérogation), D3 (Courrier), D8 (Arrêté dérogation)
// ---------------------------------------------------------------------------

export const SEED_DÉCISIONS_ADMINISTRATIVES: SeedDécisionAdministrative[] = [
  // D1 – éolien Bretagne – arrêté dérogation préfectoral
  {
    id: "da000001-0000-4000-a000-000000000001",
    dossier: 9000001,
    numéro: "29-2023-142",
    type: "Arrêté dérogation",
    date_signature: new Date("2023-07-12"),
    date_fin_obligations: new Date("2027-12-31"),
  },
  // D3 – hirondelle Grand Est – courrier préfectoral
  {
    id: "da000002-0000-4000-a000-000000000002",
    dossier: 9000003,
    numéro: null,
    type: "Courrier",
    date_signature: new Date("2024-09-18"),
    date_fin_obligations: new Date("2028-04-30"),
  },
  // D8 – cigogne IDF – arrêté dérogation
  {
    id: "da000003-0000-4000-a000-000000000003",
    dossier: 9000008,
    numéro: "77-2024-008",
    type: "Arrêté dérogation",
    date_signature: new Date("2024-01-20"),
    date_fin_obligations: new Date("2027-10-31"),
  },
];

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------

export const SEED_PRESCRIPTIONS: SeedPrescription[] = [
  // --- D1 (da000001) — éolien Bretagne ---

  {
    id: "a0000001-0000-4000-a000-000000000001",
    décision_administrative: "da000001-0000-4000-a000-000000000001",
    date_échéance: new Date("2024-05-31"),
    numéro_article: "Article 4",
    description:
      "Mise en place d'un protocole de suivi de la mortalité par les chiroptères (passage mensuel d'avril à octobre) pendant 3 ans consécutifs à la mise en service.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },
  {
    id: "a0000002-0000-4000-a000-000000000002",
    décision_administrative: "da000001-0000-4000-a000-000000000001",
    date_échéance: new Date("2024-09-30"),
    numéro_article: "Article 5",
    description:
      "Bridage nocturne des 5 éoliennes d'avril à octobre entre le coucher et le lever du soleil, dès lors que la température est supérieure à 10°C et la vitesse du vent inférieure à 6 m/s.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },
  {
    id: "a0000003-0000-4000-a000-000000000003",
    décision_administrative: "da000001-0000-4000-a000-000000000001",
    date_échéance: new Date("2025-03-31"),
    numéro_article: "Article 6",
    description:
      "Transmission du rapport annuel de suivi chiroptères et avifaune à la DREAL Bretagne, incluant les données brutes de détection acoustique.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },
  {
    id: "a0000004-0000-4000-a000-000000000004",
    décision_administrative: "da000001-0000-4000-a000-000000000001",
    date_échéance: new Date("2024-03-01"),
    numéro_article: "Article 7",
    description:
      "Balisage des 3 haies bocagères identifiées comme corridors à chiroptères dans l'emprise chantier, avec mise en exclos sur 5 m de part et d'autre.",
    surface_évitée: 3000,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },

  // --- D3 (da000002) — hirondelle Grand Est ---

  {
    id: "a0000005-0000-4000-a000-000000000005",
    décision_administrative: "da000002-0000-4000-a000-000000000002",
    date_échéance: new Date("2025-02-28"),
    numéro_article: null,
    description:
      "Travaux de ravalement réalisés entre le 16/09/2024 et le 28/02/2025, en dehors de la période de reproduction de l'Hirondelle de fenêtre (mars–août).",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },
  {
    id: "a0000006-0000-4000-a000-000000000006",
    décision_administrative: "da000002-0000-4000-a000-000000000002",
    date_échéance: new Date("2025-04-01"),
    numéro_article: null,
    description:
      "Pose de 4 nids artificiels en béton bois de type double-nid sur la façade rénovée, à une hauteur minimale de 4 mètres, avant le retour des hirondelles au printemps.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: 4,
    individus_évités: null,
    individus_compensés: null,
  },
  {
    id: "a0000007-0000-4000-a000-000000000007",
    décision_administrative: "da000002-0000-4000-a000-000000000002",
    date_échéance: null,
    numéro_article: null,
    description:
      "Suivi annuel de l'occupation des nids artificiels pendant 3 années consécutives (2025, 2026, 2027) avec transmission d'un compte-rendu illustré à la DREAL Grand Est.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },

  // --- D8 (da000003) — cigogne IDF ---

  {
    id: "a0000008-0000-4000-a000-000000000008",
    décision_administrative: "da000003-0000-4000-a000-000000000003",
    date_échéance: new Date("2024-02-01"),
    numéro_article: "Article 3",
    description:
      "Démontage du nid de Cigogne blanche en dehors de la saison de reproduction (avant le 1er février 2024), en présence d'un écologue mandaté.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },
  {
    id: "a0000009-0000-4000-a000-000000000009",
    décision_administrative: "da000003-0000-4000-a000-000000000003",
    date_échéance: new Date("2024-03-01"),
    numéro_article: "Article 3",
    description:
      "Installation de 2 plateformes métalliques de nidification (diamètre 80 cm) sur des supports adaptés à proximité immédiate du clocher, avant le retour des cigognes.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: 2,
    individus_évités: null,
    individus_compensés: null,
  },
  {
    id: "a0000010-0000-4000-a000-000000000010",
    décision_administrative: "da000003-0000-4000-a000-000000000003",
    date_échéance: null,
    numéro_article: "Article 4",
    description:
      "Suivi de l'occupation des plateformes de nidification pendant 3 ans (2024, 2025, 2026) avec transmission d'un rapport annuel à la DRIAT IDF précisant le nombre de couples nicheurs et le succès reproducteur.",
    surface_évitée: null,
    surface_compensée: null,
    nids_évités: null,
    nids_compensés: null,
    individus_évités: null,
    individus_compensés: null,
  },
];

// ---------------------------------------------------------------------------
// Contrôles
// ---------------------------------------------------------------------------

export const SEED_CONTRÔLES: SeedContrôle[] = [
  // --- D1 prescriptions (a0000001–a0000004) ---

  {
    id: "c0000001-0000-4000-a000-000000000001",
    prescription: "a0000001-0000-4000-a000-000000000001",
    date_contrôle: new Date("2024-12-10T00:00:00+00:00"),
    résultat: "Conforme",
    commentaire:
      "Protocole de suivi chiroptères mis en œuvre dès la mise en service. Premier rapport annuel transmis le 28/11/2024, conforme aux prescriptions.",
    type_action_suite_contrôle: null,
    date_action_suite_contrôle: null,
    date_prochaine_échéance: new Date("2025-12-10"),
  },
  {
    id: "c0000002-0000-4000-a000-000000000002",
    prescription: "a0000002-0000-4000-a000-000000000002",
    date_contrôle: new Date("2024-07-18T00:00:00+00:00"),
    résultat: "Non conforme",
    commentaire:
      "Le système de bridage présente des dysfonctionnements sur 2 éoliennes (E2 et E4) depuis juin 2024. Exploitant informé par mail.",
    type_action_suite_contrôle: "Email",
    date_action_suite_contrôle: new Date("2024-07-18"),
    date_prochaine_échéance: new Date("2024-10-15"),
  },
  {
    id: "c0000003-0000-4000-a000-000000000003",
    prescription: "a0000004-0000-4000-a000-000000000004",
    date_contrôle: new Date("2024-03-25T00:00:00+00:00"),
    résultat: "Conforme",
    commentaire: "Balisage en place sur les 3 haies identifiées. Exclos correctement matérialisés.",
    type_action_suite_contrôle: null,
    date_action_suite_contrôle: null,
    date_prochaine_échéance: null,
  },

  // --- D3 prescriptions (a0000005–a0000007) ---

  {
    id: "c0000004-0000-4000-a000-000000000004",
    prescription: "a0000006-0000-4000-a000-000000000006",
    date_contrôle: new Date("2025-04-22T00:00:00+00:00"),
    résultat: "Conforme",
    commentaire: "4 nids artificiels posés en béton bois, bien orientés, à 4,2 m de hauteur.",
    type_action_suite_contrôle: null,
    date_action_suite_contrôle: null,
    date_prochaine_échéance: new Date("2026-04-30"),
  },
  {
    id: "c0000005-0000-4000-a000-000000000005",
    prescription: "a0000007-0000-4000-a000-000000000007",
    date_contrôle: new Date("2025-09-15T00:00:00+00:00"),
    résultat: "Non conforme",
    commentaire:
      "Compte-rendu de suivi 2025 non transmis à la date attendue (31/07/2025). Relance adressée.",
    type_action_suite_contrôle: "Email",
    date_action_suite_contrôle: new Date("2025-09-15"),
    date_prochaine_échéance: new Date("2025-10-31"),
  },

  // --- D8 prescriptions (a0000008–a0000010) ---

  {
    id: "c0000006-0000-4000-a000-000000000006",
    prescription: "a0000008-0000-4000-a000-000000000008",
    date_contrôle: new Date("2024-02-07T00:00:00+00:00"),
    résultat: "Conforme",
    commentaire:
      "Démontage du nid réalisé le 31/01/2024 en présence de Mme Hélène Gardet (écologue). Aucun individu présent lors de l'opération.",
    type_action_suite_contrôle: null,
    date_action_suite_contrôle: null,
    date_prochaine_échéance: null,
  },
  {
    id: "c0000007-0000-4000-a000-000000000007",
    prescription: "a0000009-0000-4000-a000-000000000009",
    date_contrôle: new Date("2024-03-12T00:00:00+00:00"),
    résultat: "Conforme",
    commentaire:
      "2 plateformes installées le 22/02/2024 sur mâts télescopiques à 7 m de hauteur. Photos transmises.",
    type_action_suite_contrôle: null,
    date_action_suite_contrôle: null,
    date_prochaine_échéance: new Date("2025-05-31"),
  },
  {
    id: "c0000008-0000-4000-a000-000000000008",
    prescription: "a0000010-0000-4000-a000-000000000010",
    date_contrôle: new Date("2025-07-14T00:00:00+00:00"),
    résultat: "Non conforme",
    commentaire:
      "Rapport de suivi 2024 non transmis malgré relance. Aucun couple nicheur observé sur les 2 plateformes en 2024 (probablement dû à la perturbation des travaux adjacents).",
    type_action_suite_contrôle: "Email",
    date_action_suite_contrôle: new Date("2025-07-14"),
    date_prochaine_échéance: new Date("2025-09-30"),
  },
];
