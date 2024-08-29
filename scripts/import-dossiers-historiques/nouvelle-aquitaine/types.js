//@ts-check

/** @import {GeoAPICommune, GeoAPIDépartement} from "../../types/GeoAPI.ts" */


/**
 * @typedef {{
* 'n° ligne': number,
* 'Type de projet': string,
* 'Nom du projet': string,
* 'Porteur de projet': string,
* 'Localisation': (GeoAPICommune | string)[] | GeoAPIDépartement[],
* 'Localisation string': string,
* 'Dpt': (GeoAPIDépartement | string)[],
* 'But': string,
* 'CdM': string,
* 'Procédure': string,
* 'Date réception Guichet Unique': Date,
* 'Date réception DBEC': Date,
* 'Echéance rép': string,
* 'Etat du dossier': string,
* 'DDEP requise': 'oui' | 'non' | '?' | '',
* 'Date envoi dernier avis SPN': Date,
* 'Nombre d\'avis émis': number,
* 'Date réception DDEP': Date,
* 'Attente de': 'DDT(M)' | 'DREP' | 'Expert' | 'Ministère' | 'Pétitionnaire' | 'Préfecture' | 'SPN',
* 'N°ONAGRE de demande ': string,
* 'Date saisine CSRPN': Date,
* 'Date saisine CNPN': Date,
* 'Date avis CNPN / CSRPN)': Date,
* 'Dates consultation public': Date,
* "Type d'arrêté": 'Arrêté modificatif' | 'Pas de DDEP' | 'Procédure embarquée' | 'Régime propre',
* 'Date arrêté (AP)': Date,
* 'Réf arrêté (AP)': string,
* 'Décision': 'Anulation' | 'Dérogation' | 'Refus' | 'Rejet',
* 'Date AM': Date,
* 'Remarques internes DREP': string,
* 'Sollicitation n°2': string,
* 'Date envoi avis SPN n°2': Date,
* 'Sollicitation n°3': string,
* 'Date envoi avis SPN n°3': Date,
* 'enjeu politique': string,
* 'enjeu écologique': string,
* 'commentaires sur les enjeux et le contexte': string
* 'SIRET': string,
* 'mail de contact': string,
* 'Prénom contact': string,
* 'Nom contact': string,
* }} _DossierTableauSuiviNouvelleAquitaine2023
*/

/** @typedef {Partial<_DossierTableauSuiviNouvelleAquitaine2023>} DossierTableauSuiviNouvelleAquitaine2023 */

export default 'TS needs a module'