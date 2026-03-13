/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */
/** @import { PersonneId } from '../../types/database/public/Personne.js' */

import { compareDesc, eachWeekOfInterval } from 'date-fns';
import { directDatabaseConnection } from '../database.js';
import { ÉVÈNEMENTS_CONSULTATIONS, ÉVÈNEMENTS_MODIFICATIONS } from './aarri/constantes.js';
import { getPersonnesAcquisesAvecSemaine, getPersonnesActivesAvecSemaine, getPersonnesImpactAvecSemaine } from './aarri/personnes-par-phase.js';
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
 * Calcule le nombre de personnes retenues sur Pitchou pour chaque semaine depuis toujours (bien qu'on rappelle que la durée de stockage de ces données est d'un an).
 * Une personne retenue est une personne qui renouvelle 5 actions consultation ou modification sur une semaine sur au moins 5 des 8 dernières semaines.
 * 
 * @remark
 * On décide de regarder le nombre de semaines validées sur une période de 8 semaines pour tenir compte des congés des instructrices (utilisateurices).
 * 
 * @returns { Promise<Map<Semaine, number>> } Une correspondance entre la date de la semaine concernée et le nombre de retenu.e.s à cette date
*/
async function calculerIndicateurRetenu() {
    // Paramètres de la condition de rétention
    const évènements = [...ÉVÈNEMENTS_CONSULTATIONS, ...ÉVÈNEMENTS_MODIFICATIONS]
    const nombreSemainesGlissantesÀObserver = 8
    const nombreSeuilActionsParSemaine = 5
    const nombreSeuilSemainesValidées = 5

    /** @type {Semaine[]} */
    const semaines = eachWeekOfInterval(
        {
            start: new Date('2026-01-01T00:00:00.000Z'),
            end: new Date(),
        },
        {
            weekStartsOn: 1,
        }
    ).map((semaine) => semaine.toISOString())

    
    /** @type {{ rows: { personne: string, nombre_actions: string, semaine: Semaine }[] }} */
    const retourRequête = await directDatabaseConnection.raw(`
        -- personnes et le nombre évènement d'action de modif/consult par semaine
select
	personne,
	COUNT(évènement) as nombre_actions,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenements)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, semaine;
        `, {
            evenements: directDatabaseConnection.raw(
                évènements.map(() => '?').join(', '), évènements)

        })

    /**@type {{personne: PersonneId, nombre_actions: number, semaine: Semaine}[]} */
    // @ts-ignore
    const retourRequêteFormattée = retourRequête.rows.map((row) => ({personne: Number(row.personne), nombre_actions: Number(row.nombre_actions), semaine: row.semaine.toISOString()}))

    /**@type {Map<PersonneId, Map<Semaine, number>>} */
    const résultatsParPersonne = new Map()

    for (const {personne, nombre_actions, semaine} of retourRequêteFormattée) {
        /** @type {Map<Semaine, number>} */
        const nombreActionsParSemaine = résultatsParPersonne.get(personne) || new Map()
        nombreActionsParSemaine.set(semaine, nombre_actions)
        résultatsParPersonne.set(personne, nombreActionsParSemaine)
    }

    // Pour chaque personne, identifier la première semaine où elle a été retenue.
    /** @type {Map<PersonneId, Semaine>} */
    const premièreSemaineRetenuParPersonne = new Map()

    résultatsParPersonne.forEach((nombreActionsParSemaine, personne) => {
        const semaineRetenue = getPremièreSemaineRetenue(nombreActionsParSemaine, nombreSeuilActionsParSemaine, nombreSemainesGlissantesÀObserver, semaines, nombreSeuilSemainesValidées)

        if (semaineRetenue) {
            premièreSemaineRetenuParPersonne.set(personne, semaineRetenue)       
        }
    })
    
    //Calculer le nombre de personnes retenues par semaine
    /** @type {Map<Semaine, number>} */
    const nombreRetenusParSemaine = new Map()

    /** @type {Map<Semaine, [PersonneId, Semaine][]>} */
    const personnesPremièreFoisRetenueRegroupéesParSemaine = Map.groupBy([...premièreSemaineRetenuParPersonne], ([_, semaine]) => semaine)

    personnesPremièreFoisRetenueRegroupéesParSemaine.forEach((value, cetteSemaine) => {
        const nombrePersonnesRetenuesCetteSemaine = value.length
        nombreRetenusParSemaine.set(cetteSemaine, nombrePersonnesRetenuesCetteSemaine)
    } )

    //Puis, on fait le cumul de nombre de retenu.e.s par semaine
    /** @type {Map<Semaine, number>} */
    const nombreRetenusCumulésParSemaine = new Map()

    let nombreRetenusCumulés = 0
    for (const semaineObservée of semaines) {
        nombreRetenusCumulés = nombreRetenusCumulés + (nombreRetenusParSemaine.get(semaineObservée) ?? 0)
        nombreRetenusCumulésParSemaine.set(semaineObservée, nombreRetenusCumulés)
    }

    return nombreRetenusCumulésParSemaine
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
function getPremièreSemaineRetenue(nombreActionsParSemaine, nombreSeuilActionsParSemaine, nombreSemainesGlissantesÀObserver, semaines, nombreSeuilSemainesValidées) {
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
    const nombreSemainesObservées = 5

    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculerIndicateurAcquis(nombreSemainesObservées);
    const actifs = await calculerIndicateurActif(nombreSemainesObservées);
    const retenus = await calculerIndicateurRetenu()
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
