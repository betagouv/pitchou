/**
 * @template T
 * @typedef { {[K in keyof T]: string} } StringValues
 */

/** @typedef { 'Animalia' | 'Plantae' | 'Fungi' | 'Chromista' } Règne // incomplet */
/** @typedef { 'Aves' | 'Amphibia' | 'Actinopterygii' | 'Malacostraca' | 'Mammalia' | 'Anthozoa' | 'Equisetopsida' | 'Gastropoda' | 'Insecta' | 'Bivalvia' | 'Petromyzonti' | 'Lecanoromycetes' | 'Ulvophyceae' | 'Holothuroidea' | 'Elasmobranchii' | 'Arachnida' | 'Charophyceae' | 'Cephalopoda' | 'Echinoidea' | 'Phaeophyceae' } Classe // incomplet */

/** 
 * Notre classification. Basée sur les directives européennes (oiseau, habitat, plantes)
 * @typedef {"oiseau" | "faune non-oiseau" | "flore"} ClassificationEtreVivant 
 */

/**
 * Lignes du fichier TAXREF.txt (INPN)
 * Il peut y avoir plusieurs lignes avec le même CD_REF (mais différents CD_NOM) si l'espèce a des synonymes 
 * 
 * @typedef {Object} TAXREF_ROW
 * @prop { string } CD_NOM 
 * @prop { string } CD_REF
 * @prop { string } LB_NOM 
 * @prop { string } NOM_VERN 
 * @prop { Classe } CLASSE 
 * @prop { Règne } REGNE 
 * // incomplet
 */

/**
 * Lignes du fichier BDC_STATUT.csv (INPN)
 * Il peut y avoir plusieurs lignes avec le même CD_NOM si l'espèce est protégées à plusieurs endroits
 *
 * @typedef {Object} BDC_STATUT_ROW
 * @prop { TAXREF_ROW['CD_NOM'] } CD_NOM 
 * @prop { TAXREF_ROW['CD_REF'] } CD_REF
 * @prop { 'POM' | 'PD' | 'PN' | 'PR' | 'Protection Pitchou' } CD_TYPE_STATUT
 * @prop { string } LABEL_STATUT
 * // incomplet
 */



/**
 * Lignes du fichier liste-espèces-protégées.csv
 * Il peut y avoir plusieurs lignes avec le même CD_REF (mais différents CD_NOM) si l'espèce a des synonymes 
 * 
 * @typedef {Object} EspèceProtégée
 * @prop { TAXREF_ROW['CD_REF'] } CD_REF
 * @prop { Set<TAXREF_ROW['NOM_VERN']> } nomsVernaculaires - TAXREF_ROW['NOM_VERN'] contient parfois plusieurs noms. Ils sont séparés dans le set
 * @prop { Set<TAXREF_ROW['LB_NOM']> } nomsScientifiques - plusieurs noms si plusieurs CD_NOM pour le même CD_REF
 * @prop { ClassificationEtreVivant } classification
 * @prop { Set<BDC_STATUT_ROW['CD_TYPE_STATUT']> } CD_TYPE_STATUTS
 */


/** 
 * Les Set<string> deviennent des string séparés par des `,`
 * @typedef {StringValues<EspèceProtégée>} EspèceProtégéeStrings 
 */


/** 
 * @typedef { Object } ActivitéMenançante
 * @prop {string} Code
 * @prop {ClassificationEtreVivant} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 * @prop {'o' | 'n'} Méthode
 * @prop {'o' | 'n'} transport
 */
/** 
 * @typedef { Object } MéthodeMenançante
 * @prop {string} Code
 * @prop {ClassificationEtreVivant} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 */
/** 
 * @typedef { Object } TransportMenançant
 * @prop {string} Code
 * @prop {ClassificationEtreVivant} Espèces
 * @prop {string} Libellé long
 * @prop {string} étiquette affichée
 */


/**
 * @typedef {Object} EtreVivantAtteint
 * @prop { EspèceProtégée } espèce
 * @prop { string } nombreIndividus
 * @prop { number } surfaceHabitatDétruit
 * @prop { ActivitéMenançante } activité
 * @prop { MéthodeMenançante } [méthode]
 * @prop { TransportMenançant } [transport]
 */

/**
 * @typedef {Object} EtreVivantAtteintJSON
 * @prop { EspèceProtégée['CD_REF'] } espèce
 * @prop { string } nombreIndividus
 * @prop { number } surfaceHabitatDétruit
 * @prop { string } activité // Code
 * @prop { string } [méthode] // Code
 * @prop { string } [transport] // Code
 */

/**
 * @typedef {Object} OiseauAtteintSpecifique
 * @prop { number } nombreNids
 * @prop { number } nombreOeufs
 */

/** @typedef {EtreVivantAtteint & OiseauAtteintSpecifique} OiseauAtteint */
/** @typedef {EtreVivantAtteintJSON & OiseauAtteintSpecifique} OiseauAtteintJSON */

/**
 * @typedef {Object} DescriptionMenaceEspèce
 * @prop { ClassificationEtreVivant } classification
 * @prop { (OiseauAtteint | EtreVivantAtteint)[] } etresVivantsAtteints
 */

/**
 * @typedef {Object} DescriptionMenaceEspèceJSON
 * @prop { ClassificationEtreVivant } classification
 * @prop { (OiseauAtteintJSON | EtreVivantAtteintJSON)[] } etresVivantsAtteints
 */
/** @typedef {DescriptionMenaceEspèceJSON[]} DescriptionMenaceEspècesJSON */

/** @typedef {string} NomGroupeEspèces */
/**
 * @typedef {Object} EspèceSimplifiée
 * @prop { EspèceProtégée['CD_REF'] } CD_REF
 * @prop { string } nom
 */
/** @typedef {Record<NomGroupeEspèces, (EspèceSimplifiée | string)[]>} GroupesEspèces */




/** 
 * @typedef {Object} GeoAPICommune
 * @prop {string} nom
 * @prop {string} code
 * @prop {string} codeDepartement
 * @prop {string} codeRegion
 * @prop {string[]} codesPostaux
 * @prop {string} siren
 * @prop {string} codeEpci
 * @prop {string} nom
 * @prop {number} population
 * 
 */

/**
 * @typedef {{
* 'n° ligne': number,
* 'Type de projet': string,
* 'Nom du projet': string,
* 'Porteur de projet': string,
* 'Localisation': (GeoAPICommune | string)[],
* 'Dpt': string,
* 'But': string,
* 'CdM': string,
* 'Procédure': string,
* 'Date réception Guichet Unique': Date,
* 'Date réception DBEC': Date,
* 'Echéance rép': string,
* 'Etat du dossier': string,
* 'DDEP requise': boolean,
* 'Date envoi dernier avis SPN': Date,
* 'Nombre d\'avis émis': number,
* 'Date réception DDEP': Date,
* 'Attente de': string,
* 'N°ONAGRE de demande': string,
* 'Date saisine CSRPN': Date,
* 'Date saisine CNPN': Date,
* 'Date avis CNPN / CSRPN': Date,
* 'Dates consultation public': string,
* 'Type d\'arrêté': string,
* 'Date arrêté (AP)': Date,
* 'Réf arrêté (AP)': string,
* 'Décision': string,
* 'Date AM': Date,
* 'Remarques internes DREP': string,
* 'Sollicitation n°2': string,
* 'Date envoi avis SPN n°2': Date,
* 'Sollicitation n°3': string,
* 'Date envoi avis SPN n°3': Date,
* 'enjeu politique': string,
* 'enjeu écologique': string,
* 'commentaires sur les enjeux et le contexte': string
* }} _DossierTableauSuiviNouvelleAquitaine2023
*/

/** @typedef {Partial<_DossierTableauSuiviNouvelleAquitaine2023>} DossierTableauSuiviNouvelleAquitaine2023 */



/**
 * @typedef {{
*   'Porteur de projet': string,
*   'Le demandeur est…': string,
*   'Numéro de SIRET': string,
*   'Qualification': string,
*   'Adresse': string,
*   'Objet du projet': string,
*   'Nom du représentant': string,
*   'Prénom du représentant': string,
*   'Qualité du représentant': string,
*   'Numéro de téléphone de contact': string,
*   'Adresse mail de contact': string,
*   'Description de la demande': string,
*   'Le projet est-il soumis à une autorisation environnementale ?': boolean,
*   'À quelle procédure le projet est-il soumis ?': string[],
*   'Motif de la dérogation': string,
*   'Précisez': string,
*   "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation": boolean,
*   "Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet": string,
*   'Détails du programme d’activité': string,
*   'Lien vers la liste des espèces concernées': string,
*   'Nom du projet': string,
*   'Cette demande concerne un programme déjà existant': boolean,
*   'Le projet se situe au niveau…': "d'une ou plusieurs communes" | "d'un ou plusieurs départements" | "d'une ou plusieurs régions"
*   'Commune(s) où se situe le projet': (GeoAPICommune | string)[],
*   'Département(s) où se situe le projet': string[],
*   'Région(s) où se situe le projet': string[],
*   'Date de début d’intervention': Date,
*   'Date de fin d’intervention': Date,
*   'Date de début de chantier': Date,
*   'Date de fin de chantier': Date,
*   'Qualification des personnes amenées à intervenir': { 'Nom Prénom': string, 'Qualification': string, 'CV': string }[],
*   "Modalités techniques de l'intervention": string,
*   "Bilan d'opérations antérieures": string,
*   'Description succincte du projet': string,
*   'Dépot du dossier complet de demande de dérogation': string,
*   "Mesures d'évitement, réduction et/ou compensation": boolean
* }} _DossierDémarcheSimplifiée88444
*/

/** @typedef {Partial<_DossierDémarcheSimplifiée88444>} DossierDémarcheSimplifiée88444 */


/**
 * @typedef {{
*   'Enjeu écologique': boolean,
*   'Enjeu politique': boolean,
*   'Commentaires sur les enjeux et la procédure': string,
*   'Date de réception DDEP': Date,
*   'Dernière contribution en lien avec l\'instruction DDEP': string,
*   'Date d\'envoi de la dernière contribution en lien avec l\'instruction DDEP': Date,
*   'Autres documents relatifs au dossier': string,
*   'N° Demande ONAGRE': string,
*   'Saisine de l\'instructeur': string,
*   'Date saisine CSRPN': Date,
*   'Date saisine CNPN': Date,
*   'Date avis CSRPN': Date,
*   'Date avis CNPN': Date,
*   'Avis CSRPN/CNPN': string,
*   'Avis CSRPN/CNPN fichier': string,
*   'Date de début de la consultation du public ou enquête publique': Date,
*   'Décision': string,
*   'Date de signature de l\'AP': Date,
*   'Référence de l\'AP': string,
*   'Date de l\'AM': Date,
*   'Référence de l\'AM': string,
*   'AP/AM': string
* }} _AnnotationsPrivéesDémarcheSimplifiée88444
*/

/** @typedef {Partial<_AnnotationsPrivéesDémarcheSimplifiée88444>} AnnotationsPrivéesDémarcheSimplifiée88444*/
