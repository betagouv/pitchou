//@ts-check

/** @import Dossier from '../scripts/types/database/public/Dossier.ts';

/** @import {DossierInitializer} from '../scripts/types/database/public/Dossier.ts' */

export const SEED_DEMARCHE_NUMBER = 999999;

/** @type {Omit<DossierInitializer,"number_demarches_simplifiées"> & Pick<Dossier, "number_demarches_simplifiées">} */

export const FAKE_DOSSIER_SCIENTIFIQUE = {
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
};

/** @type {Array<Omit<DossierInitializer,"number_demarches_simplifiées"> & Pick<Dossier, "number_demarches_simplifiées">>} */
export const FAKE_DOSSIERS = [
  {
    nom: "Parc éolien des Hauteurs (démo)",
    number_demarches_simplifiées: "999000001",
    date_dépôt: new Date(),
    numéro_démarche: SEED_DEMARCHE_NUMBER,
  },
  FAKE_DOSSIER_SCIENTIFIQUE,
];
