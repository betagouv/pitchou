/**
* Ce fichier a été généré automatiquement par outils/genere-types-88444.js
* en prenant data/démarches-simplifiées/schema-DS-88444.json comme source
* 
* Ne pas le modifier à la main
* 
* À la place, mettre à jour data/démarches-simplifiées/schema-DS-88444.json
* d'après https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema
* et faire relancer outils/genere-types-88444.js
*/

import { DémarchesSimpliféesDépartement, DémarchesSimpliféesCommune } from "./api.ts";

export interface DossierDemarcheSimplifiee88444 {
  "Le demandeur est…": "une personne physique" | "une personne morale";
  "Numéro de SIRET": string;
  Qualification: string;
  Adresse: string;
  "Activité principale":
    | "Aménagements fonciers (AFAF, remembrement)"
    | "Carrières de matériaux alluvionnaires"
    | "Carrières"
    | "Conservation des espèces"
    | "Demande à caractère scientifique"
    | "Desaîrage"
    | "Dommages aux biens et activités"
    | "Événementiel avec ou sans aménagement temporaire"
    | "Exploitation forestière"
    | "Industries de production de biens et marchandises"
    | "Infrastructures - Autres"
    | "Infrastructures aéroportuaires"
    | "Infrastructures des ouvrages de défense contre la mer"
    | "Infrastructures de transport ferroviaire"
    | "Infrastructures de transport maritime et fluvial"
    | "Infrastructures de transport routières"
    | "Installations agricoles"
    | "Installations de gestion des déchets"
    | "Installations de loisir et de tourisme"
    | "Inventaire lié à la connaissance"
    | "Pédagogique enseignement"
    | "Péril animalier"
    | "Plate-formes logistiques, centres commerciaux"
    | "Préservation de la sécurité et santé publique"
    | "Production énergie autre-projets liés au nucléaire"
    | "Production énergie renouvelable - Éolien"
    | "Production énergie renouvelable - Photovoltaïque"
    | "Production énergie renouvelable - Hydroélectricité"
    | "Production énergie renouvelable - Méthaniseur, biomasse"
    | "Production énergie renouvelable - Autres"
    | "Projets de bâtiments pour les services publics-installations sportives"
    | "Projets liés à la gestion de l’eau"
    | "Restauration écologique"
    | "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art"
    | "Transport (autres canalisations)"
    | "Transport eau aqueduc"
    | "Transport énergie électrique"
    | "Transport gaz"
    | "Transport hydrocarbures"
    | "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)"
    | "UTN (Unité Touristique Nouvelle)"
    | "ZAC"
    | "Autre";
  /**
   * Personne en charge du projet au sein de la personne morale
   */
  "Nom du représentant": string;
  /**
   * Personne en charge du projet au sein de la personne morale
   */
  "Prénom du représentant": string;
  "Qualité du représentant": string;
  "Numéro de téléphone de contact": string;
  "Adresse mail de contact": string;
  "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": boolean;
  "À quelle procédure le projet est-il soumis ?": "Autorisation ICPE" | "Autorisation loi sur l'eau";
  "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation": boolean;
  "Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet": string;
  "Motif de la dérogation":
    | "Pour des RIIPM (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l’environnement)"
    | "Dans l’intérêt de la sécurité aérienne"
    | "Pour prévenir des dommages importants notamment aux cultures, à l'élevage, aux forêts, aux pêcheries, aux eaux et à d'autres formes de propriété"
    | "Pour la protection de la flore et de la faune et la conservation des habitats naturels"
    | "A des fins de recherche et d’enseignement"
    | "A des fins de repeuplement et de réintroduction de ces espèces et pour des opérations de reproduction nécessaires à ces fins, y compris la propagation artificielle des plantes"
    | "Pour permettre la prise ou la détention d'un nombre limité et spécifié de certains spécimens, dans des conditions strictement contrôlées, d'une manière sélective et dans une mesure limitée";
  "Éolien - Votre demande concerne :": "Suivi de mortalité pour un parc éolien" | "Autre";
  "Urbanisation - Votre demande concerne :": "Destruction de nids d'Hirondelles" | "Autre";
  "Transport ferroviaire ou électrique - Votre demande concerne :": "Destruction de nids de Cigognes" | "Autre";
  "Recherche scientifique - Votre demande concerne :":
    | "Une/des capture(s)/relâcher(s) immédiat(s) sur place sans marquage"
    | "Une/des capture(s)/relâcher(s) immédiat(s) sur place avec marquage"
    | "Prélèvement de matériel biologique"
    | "Autre cas";
  "Prise ou détention limité ou spécifié - Précisez":
    | "Espèces autres que oiseaux"
    | "Oiseaux autre que pour la fauconnerie"
    | "Oiseaux pour la fauconnerie"
    | "Oiseaux chassables"
    | "Oiseaux non chassables et utilisation d’une méthode interdite par l’annexe IV";
  "Captures/Relâchers/Prélèvement - Finalité(s) de la demande":
    | "Pour établissement public ayant une activité de recherche, pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre d'études scientifiques"
    | "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'évaluation préalable et du suivi des impacts sur la biodiversité de projets de travaux, d'ouvrages et d'aménagements"
    | "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'élaboration ou du suivi de plans, de schémas, de programmes ou d'autres documents de planification nécessitant l'acquisition de connaissances ou visant à la préservation du patrimoine naturel prévus par des dispositions du code de l'environnement.";
  /**
   * Lien vers la liste des espèces concernées à remplir sur https://pitchou.beta.gouv.fr/saisie-especes
   */
  "Lien vers la liste des espèces concernées": string;
  "Nom du projet": string;
  "Description synthétique du projet": string;
  "Cette demande concerne un programme de suivi déjà existant": boolean;
  "En cas de mortalité lors de ces suivis, y a-t-il eu des mesures complémentaires prises ?": boolean;
  "Précisez ces mesures :": string;
  "Année de mise en service": number;
  "Nombre d'éoliennes": number;
  "Hauteur totale bout de pale (m)": number;
  "Diamètre du rotor (m)": number;
  "Garde au sol (m)": number;
  "Dans quel département se localise majoritairement votre projet ?": DémarchesSimpliféesDépartement;
  "Le projet se situe au niveau…":
    | "d'une ou plusieurs communes"
    | "d'un ou plusieurs départements"
    | "d'une ou plusieurs régions"
    | "de toute la France";
  "Commune(s) où se situe le projet": string;
  "Département(s) où se situe le projet": string;
  "Région(s) où se situe le projet": string;
  "Précisez le périmètre d'intervention (si besoin)": string;
  /**
   * Suivi écologique, chantier...
   */
  "Date de début d’intervention": Date;
  /**
   * Suivi écologique, chantier...
   */
  "Date de fin d’intervention": Date;
  /**
   * (en années)
   */
  "Durée de la dérogation": number;
  "Description du protocole de suivi": string;
  "Nombre d'éoliennes à suivre": number;
  "Période des inventaires terrain": string;
  "Nombre de passages pendant le suivi": number;
  "Nombre de passages par semaine de suivi": number;
  "Suivi de mortalité - Votre demande concerne :":
    | "Transport des individus blessés vers un centre de soin"
    | "Transport des cadavres pour analyse au bureau"
    | "Envoi des cadavres collectés vers le MNHN/UMR CESCO pour abonder au programme de veille sanitaire";
  "Description du mode de collecte sur le terrain": string;
  "Méthode de conservation": string;
  "Adresse des locaux où seront examinés les cadavres": string;
  "En cas de nécessité de capture d'individus, précisez le mode de capture":
    | "Manuelle"
    | "Au filet"
    | "Avec épuisette"
    | "Autre moyen de capture (préciser)";
  "Préciser le(s) autre(s) moyen(s) de capture": string;
  "Utilisez-vous des sources lumineuses ?": boolean;
  "Précisez les modalités de l'utilisation des sources lumineuses": string;
  "Précisez les modalités de marquage pour chaque taxon": string;
  "Précisez les modalités de transport et la destination concernant la collecte de matériel biologique": string;
  "Qualification des intervenants": string;
  "Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)": string;
  /**
   * en particulier mesures de bridage dans le cas de suivi mortalité éolien
   */
  "Des mesures ERC sont-elles prévues ?": boolean;
  "Indiquer le nombre de nids artificiels posés en compensation": number;
  "Si nécessaire, vous pouvez déposer ici des pièces jointes complétant votre demande": string;
}


export interface AnnotationsPriveesDemarcheSimplifiee88444 {
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Nom du porteur de projet": string;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Localisation du projet": string;
  "DDEP nécessaire ?": "Oui" | "Non" | "A déterminer";
  /**
   * Ce champ permet de prioriser les dossiers
   */
  "Dossier en attente de":
    | "Action Instructeur"
    | "Action extérieure (CSRPN, CNPN, expert, pétitionnaire, autre service...)";
  "Enjeu écologique": boolean;
  "Enjeu politique": boolean;
  "Commentaires sur les enjeux et la procédure": string;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date de réception DDEP": Date;
  /**
   * Ce champ peut être utilisé librement par les instructeur.rices pour se laisser des notes sur où en est l'instruction du dossier
   */
  "Commentaires libre sur l'état de l'instruction": string;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date d'envoi de la dernière contribution en lien avec l'instruction DDEP": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "N° Demande ONAGRE": string;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date saisine CSRPN": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date saisine CNPN": Date;
  "Date avis CSRPN": Date;
  "Date avis CNPN": Date;
  "Avis CSRPN/CNPN": "Avis favorable" | "Avis favorable sous condition" | "Avis défavorable";
  "Date de début de la consultation du public ou enquête publique": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  Décision: "AP dérogation" | "AP modificatif" | "AP Refus";
  "Date de signature de l'AP": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Référence de l'AP": string;
  "Date de l'AM": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Référence de l'AM": string;
}
