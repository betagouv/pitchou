/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */
/** @import { PersonneId } from '../../types/database/public/Personne.js' */

import { compareAsc, compareDesc, eachWeekOfInterval, isAfter, isBefore, startOfWeek, subWeeks } from 'date-fns';
import { getPersonnesAcquises, getPersonnesActives, getPersonnesImpact, getPersonnesRetenues } from './aarri/personnes-par-phase.js';


/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */

/**
 * Calcule le cumul hebdomadaire du nombre de personnes sur une période observée
 *
 * @param {Map<Semaine, [Date, PersonneId][]>} personnesRegroupéesParSemaine
 * @param {Semaine} premièreSemaineObservée
 * @param {Semaine} dernièreSemaineObservée
 *
 * @returns {Map<Semaine, number>}
 */
function calculerCumulPersonnesParSemaine(personnesRegroupéesParSemaine, premièreSemaineObservée, dernièreSemaineObservée) {
    const aujourdhui = new Date()

    const semainesSources = [...personnesRegroupéesParSemaine.keys()].sort((dateA, dateB) => compareAsc(dateA, dateB));

    /** @type {Map<Semaine, number>} */
    const cumulParSemaineSurPériodeObservée = new Map()

    /** @type {Semaine[]} */
    const semaines = eachWeekOfInterval(
        {
            start: semainesSources[0],
            end: aujourdhui,
        },
        {
            weekStartsOn: 1,
        }
    ).map((semaine) => semaine.toISOString())

    let cumul = 0
    for (const semaine of semaines) {
        const élémentsParSemaine = personnesRegroupéesParSemaine.get(semaine) ?? []
        cumul = cumul + élémentsParSemaine.length
        if (isAfter(semaine, dernièreSemaineObservée) && isBefore(semaine, premièreSemaineObservée)) {
            cumulParSemaineSurPériodeObservée.set(semaine, cumul)
        }
    }

    return cumulParSemaineSurPériodeObservée
}

/**
 * Calcule le nombre de personnes acquises sur Pitchou pour chaque semaine sur les 5 dernières semaines.
 * Une personne acquise est une personne qui s'est connectée au moins une fois.
 * 
 * @param {Semaine} premièreSemaineObservée
 * @param {Semaine} dernièreSemaineObservée
 *
 * @remarks
 *
 * Pour l'instant, on considère que se connecter correspond à l'action "a cliqué sur un lien de connexion".
 * Par respect du RGPD, cet évènement sera perdu un an après son enregistrement.
 * Si c'est un problème, nous pourrons enregistrer l'évènement d'une autre manière pour ne pas perdre l'information.
 *
 * @returns { Promise<Map<Semaine, number>> } Une correspondance entre la date de la semaine observée et le nombre d'acquis.e au lundi de cette semaine
*/
async function calculerIndicateurAcquis(premièreSemaineObservée, dernièreSemaineObservée) {
    const personnesEtDate = await getPersonnesAcquises()
    const personnesParDate = new Map(personnesEtDate.map(({date, id}) => [date, id]))

    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([_, date]) => startOfWeek(new Date(date), { weekStartsOn: 1 }).toISOString())

    return calculerCumulPersonnesParSemaine(personnesRegroupéesParSemaine, premièreSemaineObservée, dernièreSemaineObservée)
}

/**
 * Calcule le nombre de personnes actives sur Pitchou pour chaque semaine sur les X dernières semaines.
 * Une personne active est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 * 
 * @param {number} nbSemainesObservées
 *
 * @returns { Promise<Map<string, number>> } Une correspondance entre la date de la semaine concernée et le nombre d'actif.ve à cette date
*/

/**
 * Calcule le nombre de personnes actives sur Pitchou sur une période.
 * Une personne active est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 * 
 * @param {Semaine} premièreSemaineObservée
 * @param {Semaine} dernièreSemaineObservée
 *
 * @returns { Promise<Map<Semaine, number>> } Une correspondance entre la date de la semaine observée et le nombre de personnes actives au lundi de cette semaine.
*/
async function calculerIndicateurActif(premièreSemaineObservée, dernièreSemaineObservée) {
    const personnesEtDate = await getPersonnesActives()
    const personnesParDate = new Map(personnesEtDate.map(({date, id}) => [date, id]))

    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([_, date]) => startOfWeek(new Date(date), { weekStartsOn: 1 }).toISOString())

    return calculerCumulPersonnesParSemaine(personnesRegroupéesParSemaine, premièreSemaineObservée, dernièreSemaineObservée)
}


/**
 * Calcule le nombre de personnes qui ont créé un impact sur Pitchou pour chaque semaine
 * L'impact de Pitchou est mesuré par les retours à conformité
 * 
 * @param {Semaine} premièreSemaineObservée
 * @param {Semaine} dernièreSemaineObservée
 *
 * Une correspondance entre la date de la semaine concernée et le nombre de personne 
 * ayant un "impact" à cette date
 * @returns { Promise<Map<string, number>> } 
*/
async function calculerIndicateurImpact(premièreSemaineObservée, dernièreSemaineObservée) {
    const personnesEtDate = await getPersonnesImpact()
    const personnesParDate = new Map(personnesEtDate.map(({date, id}) => [date, id]))

    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([_, date]) => startOfWeek(new Date(date), { weekStartsOn: 1 }).toISOString())

    return calculerCumulPersonnesParSemaine(personnesRegroupéesParSemaine, premièreSemaineObservée, dernièreSemaineObservée)
}

/**
 * Calcule le nombre de personnes retenues sur Pitchou pour chaque semaine sur les X dernières semaines.
 * 
 * @param {Semaine} premièreSemaineObservée
 * @param {Semaine} dernièreSemaineObservée
 *
 * Une correspondance entre la date de la semaine concernée et le nombre de personnes retenues 
 * @returns { Promise<Map<string, number>> } 
*/
async function calculerIndicateurRetenu(premièreSemaineObservée, dernièreSemaineObservée) {
    const aujourdhui = new Date()
    const personnesEtDate = await getPersonnesRetenues()
    const personnesParDate = new Map(personnesEtDate.map(({semaine: date, id}) => [date, id]))

    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([_, date]) => startOfWeek(new Date(date), { weekStartsOn: 1 }).toISOString())

    const semainesAcquisitions = [...personnesRegroupéesParSemaine.keys()].sort((dateA, dateB) => compareAsc(dateA, dateB));

   /** @type {Map<Semaine, number>} */
    const nombrePersonnesCumuléesParSemaineSurPériodeObservée = new Map()
    /** @type {Semaine[]} */
    const semaines = eachWeekOfInterval(
        {
            start: semainesAcquisitions[0],
            end: aujourdhui,
        },
        {
            weekStartsOn: 1,
        }
    ).map((semaine) => semaine.toISOString())


    let nombreCumulées = 0
    for (const semaine of semaines) {
        const personnesParSemaines = personnesRegroupéesParSemaine.get(semaine) ?? []
        nombreCumulées = nombreCumulées + personnesParSemaines.length
        if (isAfter(semaine, dernièreSemaineObservée) && isBefore(semaine, premièreSemaineObservée)) {
            nombrePersonnesCumuléesParSemaineSurPériodeObservée.set(semaine, nombreCumulées)
        }
    }

    return nombrePersonnesCumuléesParSemaineSurPériodeObservée
}

/**
 * Calcule la première semaine à laquelle la personne est considérée comme retenue.
 * 
 * Condition de rétention : 
 * il existe une période de 8 semaines dans laquelle il y a 5 semaines validées.
 * Une semaine validée est une semaine où la personne a effectué au moins 5 actions de modification ou de consultation.
 * 
 * @param {Map<Semaine, number>} nombreActionsParSemaine
 * @param {number} nombreSeuilActionsParSemaine
 * @param {number} nombreSemainesGlissantesÀObserver
 * @param {Semaine[]} semaines
 * @param {number} nombreSeuilSemainesValidées
 * 
 * @returns {Semaine | null}
 */
export function getPremièreSemaineRetenue(nombreActionsParSemaine, nombreSeuilActionsParSemaine, nombreSemainesGlissantesÀObserver, semaines, nombreSeuilSemainesValidées) {
    let semainePersonneRetenue = null

    for (let i=0; i<= semaines.length; i++) {
        const périodeObservée = semaines.slice(i, i+nombreSemainesGlissantesÀObserver)
        const semainesValidéesSurSemainesÀObserver = périodeObservée.filter(
            (semaine) => {
                const nombreActions = nombreActionsParSemaine.get(semaine) ?? 0
                // Condition pour qu'une semaine soit validée
                return nombreActions >= nombreSeuilActionsParSemaine
            })
        // Condition pour que la personne soit dite retenue sur cette période de 8 semaines.
        if (semainesValidéesSurSemainesÀObserver.length >= nombreSeuilSemainesValidées) {
            return semainesValidéesSurSemainesÀObserver.at(-1) || null
        }
    }

    return semainePersonneRetenue

}


/**
 * @returns {Promise<IndicateursAARRI[]>}
 */
export async function indicateursAARRI() {
    const nbSemainesObservées = 5
    const aujourdhui = new Date()
    const dernièreSemaineObservée = subWeeks(aujourdhui, nbSemainesObservées)

    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculerIndicateurAcquis(aujourdhui.toISOString(), dernièreSemaineObservée.toISOString());
    const actifs = await calculerIndicateurActif(aujourdhui.toISOString(), dernièreSemaineObservée.toISOString());
    const retenus = await calculerIndicateurRetenu(aujourdhui.toISOString(), dernièreSemaineObservée.toISOString())
    const impacts = await calculerIndicateurImpact(aujourdhui.toISOString(), dernièreSemaineObservée.toISOString());

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
