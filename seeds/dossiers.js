//@ts-check

/** @import Dossier from '../scripts/types/database/public/Dossier.ts';

/** @import {DossierInitializer} from '../scripts/types/database/public/Dossier.ts' */

export const SEED_DEMARCHE_NUMBER = 999999;

/** @type {Array<Omit<DossierInitializer,"number_demarches_simplifiées"> & Pick<Dossier, "number_demarches_simplifiées">>} */
export const FAKE_DOSSIERS = [
  {
    nom: "Parc éolien des Hauteurs (démo)",
    number_demarches_simplifiées: "999000001",
    date_dépôt: new Date(),
    numéro_démarche: SEED_DEMARCHE_NUMBER,
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    date_dépôt: new Date("2024-10-21T13:36:18Z"),
    départements: JSON.stringify(["64"]),
    communes: JSON.stringify([
      { name: "Anglet", code: "64024", postalCode: "64600" },
      { name: "Biarritz", code: "64122", postalCode: "64200" },
      { name: "Bayonne", code: "64102", postalCode: "64100" },
    ]),
    nom: "Mise en place du protocole POPAmphibiens - Côte basque (Anglet, Biarritz, Bayonne)",
    number_demarches_simplifiées: "999000004",
    ddep_nécessaire: true,
    enjeu_politique: false,
    commentaire_libre:
      "Campagne d'inventaire herpétologique renforcée sur le littoral basque dans le cadre du suivi de la biodiversité des zones humides urbaines et périurbaines",
    enjeu_écologique: true,
    activité_principale: "Demande à caractère scientifique",
    description:
      "Cette étude vise à inventorier les populations d'amphibiens présentes sur trois communes du littoral basque (Anglet, Biarritz et Bayonne). Elle s'inscrit dans un programme de suivi écologique des zones humides urbaines et littorales fortement anthropisées. L'objectif est de mieux comprendre la dynamique des populations locales dans un contexte de fragmentation des habitats et de pression urbaine. Les données collectées permettront d'alimenter les stratégies de conservation régionales et les plans de gestion des milieux aquatiques.",
    scientifique_description_protocole_suivi:
      "Protocole POPAmphibiens standardisé adapté aux zones littorales urbaines. Les prospections sont réalisées de nuit à proximité des zones humides (mares, bassins, lagunes urbaines). Les observateurs procèdent à des captures ponctuelles à l'aide d'épuisettes fines, suivies d'une identification morphologique rapide avant relâcher immédiat sur le site exact de capture. En complément, des dispositifs de type Amphicapt sont installés en bordure de plans d'eau pour un échantillonnage passif. Chaque site est visité selon un plan d'échantillonnage répété afin de garantir la robustesse statistique des données.",
    scientifique_périmètre_intervention:
      "Zones humides littorales et urbaines des communes d'Anglet, Biarritz et Bayonne incluant bassins artificiels, lagunes, parcs urbains et zones naturelles résiduelles",
    scientifique_intervenants: JSON.stringify([
      { nom_complet: "Claire Dubois", qualification: "Doctorat écologie des systèmes aquatiques" },
      {
        nom_complet: "Hugo Martin",
        qualification: "Ingénieur écologue - gestion des zones humides",
      },
      { nom_complet: "Sarah Lemoine", qualification: "Master biodiversité et conservation" },
      { nom_complet: "Nicolas Ferrand", qualification: "Technicien herpétologie terrain" },
    ]),
    scientifique_précisions_autres_intervenants:
      "Les bénévoles participent uniquement aux observations visuelles et ne manipulent pas les individus",
    justification_absence_autre_solution_satisfaisante:
      "Les méthodes acoustiques et d'observation visuelle seule ne permettent pas un inventaire complet dans les milieux urbains fortement végétalisés ou turbides. La capture temporaire est donc nécessaire pour garantir la fiabilité des données.",
    motif_dérogation: "A des fins de recherche et d'enseignement",
    justification_motif_dérogation:
      "Les manipulations sont strictement limitées à une identification rapide avant relâcher immédiat afin de minimiser tout impact sur les individus",
    scientifique_bilan_antérieur: false,
    scientifique_finalité_demande: JSON.stringify([
      "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'élaboration ou du suivi de plans, de schémas, de programmes ou d'autres documents de planification nécessitant l'acquisition de connaissances ou visant à la préservation du patrimoine naturel prévus par des dispositions du code de l'environnement.",
    ]),
    etat_des_lieux_ecologique_complet_realise: true,
    prochaine_action_attendue_par: "CNPN/CSRPN",
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000010",
    date_dépôt: new Date("2023-11-15T00:00:00Z"),
    nom: "Centrale photovoltaïque de Coutras - Les Grands Prés",
    départements: JSON.stringify(["33"]),
    communes: JSON.stringify([{ name: "Coutras", code: "33127", postalCode: "33230" }]),
    activité_principale: "Production énergie renouvelable - Photovoltaïque",
    ddep_nécessaire: true,
    enjeu_politique: false,
    enjeu_écologique: false,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Instructeur",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    mesures_erc_prévues: true,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    date_debut_consultation_public: new Date("2024-09-20"),
    date_début_intervention: new Date("2025-10-01"),
    date_fin_intervention: new Date("2026-03-31"),
    durée_intervention: 30,
    historique_identifiant_demande_onagre: "2024-01567-011-001",
    commentaire_libre:
      "Répondre mail du 03/04/2024\nRéunion le 15/05/24 14h\nAttente mise à jour du dossier.\n\nFinaliser saisine CSRPN\n\nSaisine prête dans Maarch\nCSRPN saisi le 15/09\n\nConditions CSRPN acceptées, poursuivre\nAP à rédiger",
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000011",
    date_dépôt: new Date("2024-05-14T00:00:00Z"),
    nom: "Capture et translocation de Cistude d'Europe et amphibiens - Curage du canal de Brouage",
    départements: JSON.stringify(["17"]),
    communes: JSON.stringify([
      { name: "Marennes-Hiers-Brouage", code: "17219", postalCode: "17320" },
    ]),
    activité_principale: "Demande à caractère scientifique",
    ddep_nécessaire: true,
    enjeu_politique: false,
    enjeu_écologique: false,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Pétitionnaire",
    commentaire_libre: "",
    durée_intervention: 0,
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000012",
    date_dépôt: new Date("2024-04-08T00:00:00Z"),
    nom: "ZAC des Acacias - Morcenx-la-Nouvelle",
    départements: JSON.stringify(["40"]),
    communes: JSON.stringify([
      { name: "Morcenx-la-Nouvelle", code: "40196", postalCode: "40110" },
    ]),
    activité_principale:
      "Urbanisation logement (déclaration préalable travaux, PC, permis d'aménager)",
    ddep_nécessaire: true,
    enjeu_politique: false,
    enjeu_écologique: true,
    prochaine_action_attendue_par: "Consultation du public",
    date_debut_consultation_public: new Date("2025-03-05"),
    date_fin_consultation_public: new Date("2025-03-20"),
    historique_date_envoi_dernière_contribution: new Date("2025-02-18"),
    historique_identifiant_demande_onagre: "2024-01789-040-001",
    etat_des_lieux_ecologique_complet_realise: false,
    presence_especes_dans_aire_influence: false,
    risque_malgre_mesures_erc: false,
    commentaire_libre:
      "S:\\00_commun\\DBEC\\3_DREP\\32_Dossiers\\40\\40_ZA\\40_ZAC_Acacias_Morcenx\n\n18/02/2025 : dépôt MER avis CSRPN par la commune\n15/03/2025 : AP 047/2025 en cours de signature sur MAARCH (ged : 52 187)",
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000013",
    date_dépôt: new Date("2024-10-12T00:00:00Z"),
    nom: "« Routes et biodiversité » - Évaluation des capacités d'accueil des routes départementales pour les pollinisateurs sauvages en Creuse",
    départements: JSON.stringify(["23"]),
    activité_principale: "Demande à caractère scientifique",
    enjeu_politique: false,
    enjeu_écologique: false,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Instructeur",
    historique_identifiant_demande_onagre: "2024-02145-023-001",
    description:
      "Le programme vise à évaluer les capacités d'accueil des routes départementales creuseoises pour les pollinisateurs sauvages et la biodiversité associée. Il est porté conjointement par le CPIE des Pays Creusois et le CD23. Il comporte deux axes : un premier axe d'expérimentation d'aménagements favorables aux pollinisateurs (monticules de terre, bandes fleuries), et un second axe d'évaluation et de co-construction de plans de gestion avec les services routiers.",
    // @ts-ignore — Kanel-generated type is string[] but PostgreSQL expects a JSON string
    scientifique_type_demande: JSON.stringify([
      "Une/des capture(s)/relâcher(s) immédiat(s) sur place sans marquage",
    ]),
    scientifique_description_protocole_suivi:
      "Les opérations sont réalisées selon les modalités décrites dans le dossier de demande de dérogation. Les captures ne sont réalisées que lorsque la détermination des espèces n'est pas possible sans manipulation. Des nasses de type amphicapt sont installées dans les mares potentiellement attractives. Les individus sont immédiatement relâchés après identification. 3 sessions de piégeage par site sont réalisées, en mars, mai et juin.",
    // @ts-ignore — Kanel-generated type is string[] but PostgreSQL expects a JSON string
    scientifique_mode_capture: JSON.stringify(["Manuelle", "amphicapt"]),
    scientifique_périmètre_intervention:
      "Sur les propriétés du CD23 dans les communes suivantes : Guéret, La Souterraine, Aubusson, Felletin, Royère-de-Vassivière, Bourganeuf, Pontarion, Ahun, Évaux-les-Bains, Auzances",
    scientifique_intervenants: JSON.stringify([
      {
        nom_complet: "Dupont Marie",
        qualification: "Doctorat écologie terrestre + DEA biologie des populations",
      },
    ]),
    scientifique_précisions_autres_intervenants:
      "En appui ponctuel : Martin Jean, chargé de mission CPIE Pays Creusois, titulaire d'un BTS GPN",
    justification_absence_autre_solution_satisfaisante:
      "Détermination des spécimens délicate nécessitant la manipulation d'individus vivants",
    motif_dérogation: "A des fins de recherche et d'enseignement",
    scientifique_bilan_antérieur: false,
    scientifique_finalité_demande: JSON.stringify([
      "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'élaboration ou du suivi de plans, de schémas, de programmes ou d'autres documents de planification nécessitant l'acquisition de connaissances ou visant à la préservation du patrimoine naturel prévus par des dispositions du code de l'environnement.",
    ]),
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    date_début_intervention: new Date("2025-03-01"),
    date_fin_intervention: new Date("2027-12-31"),
    durée_intervention: 3,
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000014",
    date_dépôt: new Date("2025-03-04T00:00:00Z"),
    nom: "Destruction de nids d'Hirondelle de fenêtres dans le cadre de la démolition d'un bâtiment industriel désaffecté, commune de Périgueux (24)",
    départements: JSON.stringify(["24"]),
    communes: JSON.stringify([{ name: "Périgueux", code: "24322", postalCode: "24000" }]),
    activité_principale:
      "Urbanisation logement (déclaration préalable travaux, PC, permis d'aménager)",
    ddep_nécessaire: true,
    enjeu_politique: false,
    enjeu_écologique: false,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Personne",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    mesures_erc_prévues: false,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    mesures_er_suffisantes: false,
    durée_intervention: 0,
    commentaire_libre:
      "Bâtiment industriel désaffecté, sur lequel se trouvent des nids en façade sud. Travaux de démolition prévus hors période de nidification.\nDiscussion en cours avec le maître d'ouvrage.\nMail envoyé le 15/02.",
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000015",
    date_dépôt: new Date("2025-03-11T00:00:00Z"),
    nom: "Destruction de nids d'Hirondelle de fenêtres dans le cadre du ravalement de façade d'un bâtiment communal, Nontron (24)",
    départements: JSON.stringify(["24"]),
    communes: JSON.stringify([{ name: "Nontron", code: "24311", postalCode: "24300" }]),
    activité_principale:
      "Urbanisation logement (déclaration préalable travaux, PC, permis d'aménager)",
    enjeu_politique: false,
    enjeu_écologique: false,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Personne",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    mesures_erc_prévues: false,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    durée_intervention: 0,
    commentaire_libre:
      "Dossier simplifié - ravalement de façade prévu au printemps. Nids à déplacer avant travaux.",
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000016",
    date_dépôt: new Date("2025-06-03T00:00:00Z"),
    nom: "Suivi de la contamination aux métaux lourds dans les œufs de Sternes pierregarins des pertuis charentais",
    départements: JSON.stringify(["17"]),
    communes: JSON.stringify([
      { name: "Fouras", code: "17167", postalCode: "17450" },
      { name: "Île-d'Aix", code: "17190", postalCode: "17123" },
    ]),
    activité_principale: "Demande à caractère scientifique",
    ddep_nécessaire: true,
    enjeu_politique: false,
    enjeu_écologique: false,
    prochaine_action_attendue_par: "CNPN/CSRPN",
    description:
      "Les métaux lourds (mercure, plomb, cadmium, arsenic) sont des polluants persistants présents dans l'environnement marin. Les Sternes pierregarins, oiseaux marins nicheurs des pertuis charentais, constituent d'excellents bio-indicateurs de la contamination côtière. Cette étude vise à prélever des œufs frais sur plusieurs sites de nidification afin de mesurer les concentrations en métaux lourds et d'évaluer l'exposition des populations locales dans le contexte des activités industrielles et portuaires du littoral charentais.",
    // @ts-ignore — Kanel-generated type is string[] but PostgreSQL expects a JSON string
    scientifique_type_demande: JSON.stringify(["Prélèvement de matériel biologique"]),
    scientifique_description_protocole_suivi:
      "La collecte des œufs sera réalisée par l'équipe du LIENSs sous la supervision des agents de la LPO Charente-Maritime. Le test de flottabilité (eau de mer) est employé pour estimer le stade d'incubation et ne collecter que des œufs fraîchement pondus. Cette technique simple et rapide minimise le temps passé dans les colonies et ne présente aucun danger pour les œufs testés.",
    scientifique_modalités_transport:
      "Transport des œufs dans container réfrigéré jusqu'au laboratoire LIENSs (UMR 7266, Université de La Rochelle) où les œufs seront photographiés, mesurés, pesés et ouverts pour prélever le jaune d'œuf dans des tubes congelés. Les analyses de métaux lourds seront réalisées par spectrométrie de masse (ICP-MS).",
    scientifique_périmètre_intervention:
      "Sites de nidification de Sternes pierregarins à Fouras (pointe de la Fumée), île d'Aix et les îlots environnants des pertuis charentais.",
    scientifique_intervenants: JSON.stringify([
      {
        nom_complet: "Bernard Sophie",
        qualification:
          "Maître de Conférences, Université de La Rochelle (UMR 7266 LIENSs), Niveau I en expérimentation animale",
      },
    ]),
    scientifique_précisions_autres_intervenants:
      "Leclerc Lucas, Technicien LPO Charente-Maritime, Niveau 1 en expérimentation animale\nDurand Anaïs, Doctorante (contamination aux métaux lourds chez les oiseaux marins côtiers), Niveau I en expérimentation animale",
    justification_absence_autre_solution_satisfaisante:
      "Le dosage des métaux lourds dans les tissus biologiques nécessite des prélèvements de matière organique (contenu de l'œuf). Il n'est pas possible d'obtenir des données fiables par simple observation ou par méthodes non invasives. La collecte d'œufs frais est la seule méthode permettant d'obtenir des concentrations représentatives de la contamination maternelle.",
    motif_dérogation: "A des fins de recherche et d'enseignement",
    justification_motif_dérogation:
      "Les Sternes pierregarins sont des bio-indicateurs pertinents de la contamination côtière aux métaux lourds. La récolte d'œufs frais est indispensable pour obtenir des données fiables sur l'exposition des populations nicheuses du littoral charentais. Le projet s'inscrit dans un programme national de surveillance de la contamination des oiseaux marins côtiers.",
    scientifique_bilan_antérieur: false,
    scientifique_finalité_demande: JSON.stringify([
      "Pour établissement public ayant une activité de recherche, pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre d'études scientifiques",
    ]),
    date_début_intervention: new Date("2026-04-15"),
    date_fin_intervention: new Date("2026-06-30"),
    durée_intervention: 0,
    commentaire_libre:
      "Demande à traiter rapidement avant la saison de nidification (avril-juin).\nReport possible sur 2027 si traitement trop tardif.",
  },
  {
    numéro_démarche: SEED_DEMARCHE_NUMBER,
    number_demarches_simplifiées: "999000017",
    date_dépôt: new Date("2025-08-22T00:00:00Z"),
    nom: "Contournement de Ribérac - RD708",
    départements: JSON.stringify(["24"]),
    communes: JSON.stringify([
      { name: "Ribérac", code: "24354", postalCode: "24600" },
      { name: "Saint-Martial-de-Valette", code: "24465", postalCode: "24300" },
    ]),
    activité_principale: "Infrastructures de transport routières",
    ddep_nécessaire: true,
    enjeu_politique: false,
    enjeu_écologique: false,
    rattaché_au_régime_ae: false,
    prochaine_action_attendue_par: "Instructeur",
    motif_dérogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    mesures_erc_prévues: true,
    etat_des_lieux_ecologique_complet_realise: true,
    presence_especes_dans_aire_influence: true,
    risque_malgre_mesures_erc: true,
    mesures_er_suffisantes: false,
    durée_intervention: 0,
  },
];
