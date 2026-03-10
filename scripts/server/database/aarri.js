/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */
/** @import { PersonneId } from '../../types/database/public/Personne.js' */

import { compareAsc, compareDesc, eachWeekOfInterval, isAfter, isBefore, subWeeks } from 'date-fns';
import { directDatabaseConnection } from '../database.js';
import { ÉVÈNEMENTS_CONSULTATIONS, ÉVÈNEMENTS_MODIFICATIONS } from './aarri/constantes.js';
import { getPersonnesAcquisesAvecSemaine, getPersonnesActivesAvecSemaine, getPersonnesImpactAvecSemaine } from './aarri/personnes-par-phase.js';

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
    const personnesEtDate = await getPersonnesAcquisesAvecSemaine()
    const personnesParDate = new Map(personnesEtDate.map(({semaine, id}) => [semaine, id]))
    console.log('Acquis')

    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([semaine]) => semaine.toISOString())

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
    const personnesEtDate = await getPersonnesActivesAvecSemaine()
    const personnesParDate = new Map(personnesEtDate.map(({semaine, id}) => [semaine, id]))
    console.log('Actif')
    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([semaine]) => semaine.toISOString())

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
    const personnesEtDate = await getPersonnesImpactAvecSemaine()
    const personnesParDate = new Map(personnesEtDate.map(({semaine, id}) => [semaine, id]))
    console.log('Impact')
    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([semaine]) => semaine.toISOString())

    return calculerCumulPersonnesParSemaine(personnesRegroupéesParSemaine, premièreSemaineObservée, dernièreSemaineObservée)
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
    const nbSemainesObservées = 5
    const aujourdhui = new Date()
    const dernièreSemaineObservée = subWeeks(aujourdhui, nbSemainesObservées)

    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculerIndicateurAcquis(aujourdhui.toISOString(), dernièreSemaineObservée.toISOString());
    const actifs = await calculerIndicateurActif(aujourdhui.toISOString(), dernièreSemaineObservée.toISOString());
    const retenus = await calculerIndicateurRetenu()
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
