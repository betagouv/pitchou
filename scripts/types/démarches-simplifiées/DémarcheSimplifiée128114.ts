/**
* Ce fichier a été généré automatiquement par outils/genere-types-schema-DS.js
* en prenant data/démarches-simplifiées/schema-DS/7f52a348-fd16-4fcd-8a6f-2e78ddafaee4.json comme source
* 
* Ne pas le modifier à la main
* 
* À la place, mettre à jour data/démarches-simplifiées/schema-DS/7f52a348-fd16-4fcd-8a6f-2e78ddafaee4.json
* d'après https://www.demarches-simplifiees.fr/preremplir/7f52a348-fd16-4fcd-8a6f-2e78ddafaee4/schema
* et relancer outils/genere-types-schema-DS.js
*/

import { GeoAPICommune, GeoAPIDépartement } from "../GeoAPI.ts";
import { ChampDSPieceJustificative } from "./apiSchema.ts";

export interface DossierDemarcheSimplifiee128114 {
  /**
   * Indiquer le nom <strong> précis </strong> de votre projet
   */
  "Nom du projet": string;
  "Dans quel département se localise majoritairement votre projet ?": GeoAPIDépartement;
  /**
   * Indiquez l'activité principale relative à votre projet.
   */
  "Activité principale":
    | "Aménagements fonciers (AFAF, remembrement)"
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
    | "Pédagogique enseignement"
    | "Péril animalier"
    | "Plate-formes logistiques, centres commerciaux"
    | "Préservation de la sécurité et santé publique"
    | "Production énergie autre-projets liés au nucléaire"
    | "Production énergie renouvelable - Éolien"
    | "Production énergie renouvelable - Éolien -  Suivi mortalité"
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
  "Restauration, démolition de bâtiments, ouvrages d'art - Votre demande concerne :":
    | "Destruction de nids d'Hirondelles"
    | "Autre";
  "Transport ferroviaire ou électrique - Votre demande concerne :": "Destruction de nids de Cigognes" | "Autre";
  "Avez-vous réalisé un état des lieux écologique complet ?": boolean;
  /**
   * L’aire d'influence s’appuie sur les éléments physiques qui peuvent délimiter naturellement le territoire (lisière, cours d’eau, urbanisation, route, barrage...) et permettre d’identifier les corridors écologiques ainsi que la fonctionnalité des habitats d’espèces.
   */
  "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?": boolean;
  /**
   * Pour plus de précisions sur la notion de risque suffisamment caractérisé, consulter les avis du Conseil d'état du 09/12/2022 : https://www.legifrance.gouv.fr/ceta/id/CETATEXT000046732849?init=true&page=1&query=463563&searchField=ALL&tab_selection=all,
   * ainsi que celui du 17 février 2023 : https://www.conseil-etat.fr/fr/arianeweb/CE/decision/2023-02-17/460798 et les conclusions du rapporteur public relatives à cet avis : http://www.conseil-etat.fr/fr/arianeweb/CRP/conclusion/2022-12-09/463563
   */
  "Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il ?": boolean;
  "Le demandeur est…": "une personne physique" | "une personne morale";
  "Numéro de SIRET": string;
  /**
   * Si le demandeur est une personne physique
   */
  Qualification: string;
  Adresse: string;
  /**
   * Personne en charge du projet au sein de la personne morale
   */
  "Nom du représentant": string;
  /**
   * Personne en charge du projet au sein de la personne morale
   */
  "Prénom du représentant": string;
  /**
   * Si le demandeur est une personne morale
   */
  "Qualité du représentant": string;
  "Numéro de téléphone de contact": string;
  "Adresse mail de contact": string;
  "Description synthétique du projet": string;
  "Nombre de nids d'Hirondelles détruits": number;
  "Le projet se situe au niveau…":
    | "d'une ou plusieurs communes"
    | "d'un ou plusieurs départements"
    | "d'une ou plusieurs régions"
    | "de toute la France";
  "Commune(s) où se situe le projet": (GeoAPICommune | string)[];
  "Département(s) où se situe le projet": GeoAPIDépartement[];
  "Région(s) où se situe le projet": string[];
  "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
    | "Oui"
    | "Non"
    | "Ne sait pas encore";
  "À quelle procédure le projet est-il soumis ?": ("Autorisation ICPE" | "Autorisation loi sur l'eau")[];
  /**
   * Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes
   */
  "Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes": ChampDSPieceJustificative;
  "Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet": string;
  "Motif de la dérogation":
    | "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l’environnement)"
    | "Dans l’intérêt de la sécurité aérienne"
    | "Pour prévenir des dommages importants notamment aux cultures, à l'élevage, aux forêts, aux pêcheries, aux eaux et à d'autres formes de propriété"
    | "Pour la protection de la flore et de la faune et la conservation des habitats naturels"
    | "A des fins de recherche et d’enseignement"
    | "A des fins de repeuplement et de réintroduction de ces espèces et pour des opérations de reproduction nécessaires à ces fins, y compris la propagation artificielle des plantes"
    | "Pour permettre la prise ou la détention d'un nombre limité et spécifié de certains spécimens, dans des conditions strictement contrôlées, d'une manière sélective et dans une mesure limitée";
  "Synthèse des éléments justifiant le motif de la dérogation": string;
  "Recherche scientifique - Votre demande concerne :": (
    | "Une/des capture(s)/relâcher(s) immédiat(s) sur place sans marquage"
    | "Une/des capture(s)/relâcher(s) immédiat(s) sur place avec marquage"
    | "Prélèvement de matériel biologique"
    | "Autre cas"
  )[];
  "Prise ou détention limité ou spécifié - Précisez":
    | "Espèces autres que oiseaux"
    | "Oiseaux autre que pour la fauconnerie"
    | "Oiseaux pour la fauconnerie"
    | "Oiseaux chassables"
    | "Oiseaux non chassables et utilisation d’une méthode interdite par l’annexe IV";
  "Captures/Relâchers/Prélèvement - Finalité(s) de la demande": (
    | "Pour établissement public ayant une activité de recherche, pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre d'études scientifiques"
    | "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'évaluation préalable et du suivi des impacts sur la biodiversité de projets de travaux, d'ouvrages et d'aménagements"
    | "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'élaboration ou du suivi de plans, de schémas, de programmes ou d'autres documents de planification nécessitant l'acquisition de connaissances ou visant à la préservation du patrimoine naturel prévus par des dispositions du code de l'environnement."
  )[];
  "Joindre les pièces justifiant de la finalité de la demande": ChampDSPieceJustificative;
  "Cette demande concerne un programme de suivi déjà existant": boolean;
  "Joindre le bilan des opérations antérieures": ChampDSPieceJustificative;
  "En cas de mortalité lors de ces suivis, y a-t-il eu des mesures complémentaires prises ?": boolean;
  "Précisez ces mesures :": string;
  "Ajoutez un fichier décrivant ces mesures complémentaires :": ChampDSPieceJustificative;
  "Année de mise en service": number;
  "Nombre d'éoliennes": number;
  "Hauteur totale bout de pale (m)": number;
  "Diamètre du rotor (m)": number;
  "Garde au sol (m)": number;
  "Plan des installations": ChampDSPieceJustificative;
  /**
   * La dates de début d'intervention correspond à la date de début des travaux (y compris travaux préparatoires), de début du suivi dans le cas des suivis scientifiques...
   */
  "Date de début d’intervention": Date;
  /**
   * La date de fin d'intervention correspond à la date de fin des inventaires, des travaux avant mise en service...
   */
  "Date de fin d’intervention": Date;
  /**
   * Date de début d'exploitation
   */
  "Date de mise en service": Date;
  /**
   * Ce champ est notamment à remplir pour les dérogations pluriannuelles ou pour indiquer la durée d'exploitation de l'aménagement réalisé (en années).
   */
  "Durée de la dérogation": number;
  "Précisez le périmètre d'intervention": string;
  "Joindre une carte du périmètre d'intervention si besoin": ChampDSPieceJustificative;
  "Description du protocole de suivi": string;
  "Nombre d'éoliennes à suivre": number;
  "Période des inventaires terrain": string;
  "Nombre de passages pendant le suivi": number;
  "Nombre de passages par semaine de suivi": number;
  "Pièces jointes décrivant précisément le protocole qui sera mis en place": ChampDSPieceJustificative;
  "Suivi de mortalité - Votre demande concerne :": (
    | "Transport des individus blessés vers un centre de soin"
    | "Transport des cadavres pour analyse au bureau"
    | "Envoi des cadavres collectés vers le MNHN/UMR CESCO pour abonder au programme de veille sanitaire"
  )[];
  "Description du mode de collecte sur le terrain": string;
  "Méthode de conservation": string;
  "Adresse des locaux où seront examinés les cadavres": string;
  "En cas de nécessité de capture d'individus, précisez le mode de capture": (
    | "Manuelle"
    | "Au filet"
    | "Avec épuisette"
    | "Autre moyen de capture (préciser)"
  )[];
  "Préciser le(s) autre(s) moyen(s) de capture": string;
  "Utilisez-vous des sources lumineuses ?": boolean;
  "Précisez les modalités de l'utilisation des sources lumineuses": string;
  "Précisez les modalités de marquage pour chaque taxon": string;
  "Précisez les modalités de transport et la destination concernant la collecte de matériel biologique": string;
  "Qualification des intervenants": {
    "Nom Prénom": string;
    Qualification: string;
    CV: ChampDSPieceJustificative;
  }[];
  "Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)": string;
  /**
   * En particulier mesures de bridage dans le cas de suivi mortalité éolien, mais également adaptation du calendrier des travaux aux périodes les moins sensibles, balisage/mise en exclos des secteurs à enjeux, lutte contre les espèces exotique envahissantes...
   */
  "Des mesures ERC sont-elles prévues ?": boolean;
  "Indiquer le nombre de nids artificiels posés en compensation": number;
  /**
   * Si votre dossier fait plus de 200 Mo, utilisez https://francetransfert.numerique.gouv.fr/upload pour générer un lien que vous indiquerez dans le champ "Description succincte du projet"
   */
  "Dépot du dossier complet de demande de dérogation": ChampDSPieceJustificative;
  /**
   * Fournir ici l'état des lieux écologique, ainsi que les protocoles d'inventaires utilisés, ayant permis de conclure à l'absence d'individus ou d'habitats d'espèces protégées dans l'emprise du projet.
   */
  "Diagnostic écologique": ChampDSPieceJustificative;
  /**
   * <strong>Cet argumentaire diot notamment détailler les points suivants.</strong>
   *
   * Mesures d’évitement et de réduction (E-R) :
   * - protocole de mise en œuvre (calendrier, méthodes, matériel, , etc.),
   * - localisation : une ou des cartes sont annexées, et intègrent la représentation graphique des emprises du projet (sous toutes ses composantes : bâtiments, annexes, base de vie chantier, stockage intermédiaire…)
   * - complétude (objectifs de performance, indicateurs de suivis, etc.) et garanties d’effectivité des mesures E et R :  la pertinence, la faisabilité technique et l’efficacité des mesures proposées pour atteindre les objectifs inscrits dans la demande de dérogation.
   *
   * Après application des mesures d’évitement et de réduction, caractérisation du risque (résiduel) d’atteinte à l’état de conservation des espèces protégées (habitats, individus, population et fonctionnalité des milieux pour chaque espèce)  :
   * - niveau de risque d’atteinte (compte tenu de la nature des impacts, de son intensité et/ou sa persistance)
   * - niveau de caractérisation de ce risque (fortement prévisible, potentiel…) en fonction des données du dossier, des connaissances scientifiques , des retours d’expériences…), argumentation à l’appui.
   *
   */
  "Déposez ici l'argumentaire précis vous ayant permis de conclure à l'absence de risque suffisament caractérisé pour les espèces protégées et leurs habitats.": ChampDSPieceJustificative;
  "Si nécessaire, vous pouvez déposer ici des pièces jointes complétant votre demande": ChampDSPieceJustificative[];
  /**
   * Cette question est là pour des raisons techniques.
   * La réponse à cette question n'a aucune incidence sur l'instruction de votre dossier.
   * Cette question sera bientôt supprimée.
   */
  "NE PAS MODIFIER - Données techniques associées à votre dossier": string;
}


export interface AnnotationsPriveesDemarcheSimplifiee128114 {
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Nom du porteur de projet": string;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Localisation du projet": string;
  "DDEP nécessaire ?": "Oui" | "Non" | "A déterminer";
  "Enjeu écologique": boolean;
  "Enjeu politique": boolean;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date de réception DDEP": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Dernière contribution en lien avec l'instruction DDEP": ChampDSPieceJustificative;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date d'envoi de la dernière contribution en lien avec l'instruction DDEP": Date;
  "Autres documents relatifs au dossier": ChampDSPieceJustificative;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "N° Demande ONAGRE": string;
  "Saisine de l'instructeur": ChampDSPieceJustificative;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date saisine CSRPN": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Date saisine CNPN": Date;
  /**
   * Pour les dossiers historiques en cours de saisie dans DS
   */
  "Avis CSRPN/CNPN": ChampDSPieceJustificative;
  "Date avis CSRPN": Date;
  "Date avis CNPN": Date;
  "Date avis conforme Ministre": Date;
  "Avis conforme Ministre": ChampDSPieceJustificative;
  "Date de début de la consultation du public ou enquête publique": Date;
  "Date de fin de la consultation du public ou enquête publique": Date;
  "Dépôt GeoMCE effectué ?": "Oui" | "Non" | "Partiel";
  "Date dépôt GeoMCE": Date;
  "Id projet GeoMCE": string;
  "GeoMCE - commentaire libre": string;
}
