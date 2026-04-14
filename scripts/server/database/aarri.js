/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */

import { compareDesc } from 'date-fns';
import { getPersonnesAcquisesAvecSemaine, getPersonnesActivesAvecSemaine, getPersonnesImpactAvecSemaine, getPersonnesRetenuesAvecSemaine } from './aarri/personnes-par-phase.js';
import { calculerCumulPersonnesParSemaineSurUnePériode } from './aarri/utils.js';


/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */


/**
 * Calcule le nombre de personnes acquises sur Pitchou pour chaque semaine sur les 5 dernières semaines.
 * 
 * @param {number} nombreSemainesObservées
 * 
 * @returns { Promise<Map<Semaine, number>> } Une correspondance entre la date de la semaine observée et le nombre d'acquis.e au lundi de cette semaine
*/
async function calculerIndicateurAcquis(nombreSemainesObservées) {
    const personnesAvecDate = await getPersonnesAcquisesAvecSemaine()

    return calculerCumulPersonnesParSemaineSurUnePériode(personnesAvecDate, nombreSemainesObservées)
}

/**
 * Calcule le nombre de personnes activées sur Pitchou sur une période.
 * 
 * @param {number} nombreSemainesObservées
 *
 * @returns { Promise<Map<Semaine, number>> } Une correspondance entre la date de la semaine observée et le nombre de personnes actives au lundi de cette semaine.
*/
async function calculerIndicateurActif(nombreSemainesObservées) {
    const personnesAvecDate = await getPersonnesActivesAvecSemaine()

    return calculerCumulPersonnesParSemaineSurUnePériode(personnesAvecDate, nombreSemainesObservées)
}


/**
 * Calcule le nombre de personnes qui ont créé un impact sur Pitchou pour chaque semaine
 * 
 * @param {number} nombreSemainesObservées
 *
 * @returns { Promise<Map<string, number>> } Une correspondance entre la date de la semaine concernée et le nombre de personne étant rentrées dans la phase Impact à cette date
*/
async function calculerIndicateurImpact(nombreSemainesObservées) {
    const personnesAvecDate = await getPersonnesImpactAvecSemaine()

    return calculerCumulPersonnesParSemaineSurUnePériode(personnesAvecDate, nombreSemainesObservées)
}

/**
 * Calcule le nombre de personnes retenues sur Pitchou pour chaque semaine sur les X dernières semaines.
 * 
 * @param {number} nombreSemainesObservées
 *
 * Une correspondance entre la date de la semaine concernée et le nombre de personnes retenues 
 * @returns { Promise<Map<string, number>> } 
*/
async function calculerIndicateurRetenu(nombreSemainesObservées) {
    const personnesAvecDate = await getPersonnesRetenuesAvecSemaine()
    return calculerCumulPersonnesParSemaineSurUnePériode(personnesAvecDate, nombreSemainesObservées)
}



/**
 * @returns {Promise<IndicateursAARRI[]>}
 */
export async function indicateursAARRI() {
    const nombreSemainesObservées = 5

    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculerIndicateurAcquis(nombreSemainesObservées);
    const actifs = await calculerIndicateurActif(nombreSemainesObservées);
    const retenus = await calculerIndicateurRetenu(nombreSemainesObservées)
    const impacts = await calculerIndicateurImpact(nombreSemainesObservées);

    // Tri des dates par ordre décroissant.
    // Le front-end accède aux données via l’indice du tableau et non directement par la date,
    // il est donc nécessaire de garantir un ordre cohérent ici.
    //TODO: peut-être modifier le front-end du coup...
    const dates = [...(acquis.keys())].sort((dateA, dateB) => compareDesc(dateA, dateB));

    for (const date of dates) {
        indicateurs.push({
            date: date,
            nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
            nombreUtilisateuriceActif: actifs.get(date) ?? 0,
            nombreUtilisateuriceRetenu: retenus.get(date) ?? 0,
            nombreUtilisateuriceImpact: impacts.get(date) ?? 0,
            nombreBaseUtilisateuricePotentielle: 300,
        })
    }

    return indicateurs
}
