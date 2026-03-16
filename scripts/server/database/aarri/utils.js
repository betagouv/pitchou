/** @import Évènement from '../../../types/database/public/ÉvènementMétrique' */
/** @import Personne from '../../../types/database/public/Personne' */
/** @import { ÉvènementMétrique } from '../../../types/évènement.js' */
import { compareAsc, eachWeekOfInterval, subWeeks } from 'date-fns';
import { directDatabaseConnection } from '../../database.js'

/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */

/**
 * @typedef {{id: Personne['id'], email: Personne['email'], semaine: Date}} PersonneAvecDate
 */


/**
 * @param {Personne['email']} email
 * @returns {Promise<Évènement[]>} 
 */
export async function getÉvènementsForPersonne(email) {
    const requêteSQL = await directDatabaseConnection('personne')
        .select('id')
        .where('email', '=', email)

    if (!(requêteSQL && Array.isArray(requêteSQL) && requêteSQL.length >=1 && requêteSQL[0].id)) {
        throw new Error(`Aucun id n'a été trouvé pour l'email ${email}.`)
    }

    const personneId = requêteSQL[0].id
    
    const évènements = await directDatabaseConnection('évènement_métrique')
        .select('*')
        .where('personne', '=', personneId)
        .orderBy('date','desc')

    return évènements
}

/**
 * Renvoie la liste des personnes ayant enregistré un nombre d'évènements au-delà d'un certain seuil
 * ainsi que les semaines auxquelles elles ont enregistré ce nombre d'évènements
 * 
 * @param {ÉvènementMétrique['type'][]} évènements
 * @param {number} nombreSeuil
 * @returns {Promise<PersonneAvecDate[]>}
*/
export async function getPersonnesAvecDatesAtteinteSeuilÈvènements(évènements, nombreSeuil) {
    const requêteSQL = await directDatabaseConnection.raw(
        `-- personnes et le nombre évènement suivis par semaine
with evenements_par_personne as (select
	personne,
	COUNT(évènement) as nombre_evenements,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenements)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, semaine),

-- filtrer par semaine où le seuil est atteint
seuil_atteint as (select personne, semaine
from evenements_par_personne
WHERE nombre_evenements >= :nb_seuil_evenements
group by personne, semaine
)

select personne.id, personne.email, semaine
from seuil_atteint
join personne on seuil_atteint.personne = personne.id`
        , {
            nb_seuil_evenements: nombreSeuil,
            evenements: directDatabaseConnection.raw(évènements.map(() => '?').join(', '), évènements)
        });
    const listePersonneAvecSemaine = requêteSQL.rows
    return listePersonneAvecSemaine
        
}

/**
 * Renvoie la liste des personnes ayant enregistré un nombre d'évènements au-delà d'un certain seuil pour la première fois
 * ainsi que la semaine à laquelle elles ont enregistré ce nombre d'évènements pour la première fois
 * 
 * @param {ÉvènementMétrique['type'][]} évènements
 * @param {number} nombreSeuil
 * @returns {Promise<PersonneAvecDate[]>}
*/
export async function getPersonnesAvecPremièreDateAtteinteSeuilÈvènements(évènements, nombreSeuil) {
    const personnesAvecSemaines = await getPersonnesAvecDatesAtteinteSeuilÈvènements(évènements, nombreSeuil)

    const personnesAvecPremièreSemaine = []
    
    const personnesAvecSemainesGroupéesParPersonne = Map.groupBy(personnesAvecSemaines, (personneAvecDate) => personneAvecDate.id)

    const personnes = [...new Set([...personnesAvecSemainesGroupéesParPersonne.keys()])]

    for (const personne of personnes) {
        const résultatPourLaPersonne = personnesAvecSemainesGroupéesParPersonne.get(personne)
        if (résultatPourLaPersonne) {
            const personneAvecPremièreSemaine = (résultatPourLaPersonne.sort((a,b) => compareAsc(a.semaine, b.semaine)))[0]
            personnesAvecPremièreSemaine.push(personneAvecPremièreSemaine)
        }
    }

    return personnesAvecPremièreSemaine
        
}

/**
 * Calcule le cumul hebdomadaire du nombre de personnes
 * pour un certain nombre de semaine.
 * La période observée commence il y a X semaines et finit la semaine dernière.
 * @param {PersonneAvecDate[]} personnesAvecDate
 * @param {number} nombreSemainesObservées
 *
 * @returns {Map<Semaine, number>} Une correspondance entre les X semaines et le nombre de personnes cumulées.
 */
export function calculerCumulPersonnesParSemaineSurUnePériode(personnesAvecDate, nombreSemainesObservées) {
    const personnesParDate = new Map(personnesAvecDate.map(({semaine, id}) => [semaine, id]))
    const personnesRegroupéesParSemaine = Map.groupBy(personnesParDate, ([semaine]) => semaine.toISOString())

    const aujourdhui = new Date()
    //Les évènements des utilisateurices de Pitchou sont enregistrées depuis début 2026.
    const débutEnregistrementÉvènements = new Date('01/01/2026');
    /** @type {Semaine[]} */
    const toutesLesSemaines = eachWeekOfInterval(
        {
            start: débutEnregistrementÉvènements,
            end: aujourdhui,
        },
        {
            weekStartsOn: 1,
        }
    ).map((semaine) => semaine.toISOString())

    const semaineDébutObservation = subWeeks(aujourdhui, nombreSemainesObservées)
    const semaineFinObservation = subWeeks(aujourdhui, 1)

    /** @type {Semaine[]} */
    const semainesObservéesPourAARRI = eachWeekOfInterval(
        {
            start: semaineDébutObservation,
            end: semaineFinObservation,
        },
        {
            weekStartsOn: 1,
        }
    ).map((semaine) => semaine.toISOString())

    /** @type {Map<Semaine, number>} */
    const cumulParSemaineSurPériodeObservée = new Map(semainesObservéesPourAARRI.map((semaine) => [semaine, 0]))

    let cumul = 0
    for (const semaine of toutesLesSemaines) {
        const élémentsParSemaine = personnesRegroupéesParSemaine.get(semaine) ?? []
        cumul = cumul + élémentsParSemaine.length
        if (cumulParSemaineSurPériodeObservée.has(semaine)) {
            cumulParSemaineSurPériodeObservée.set(semaine, cumul)
        }
    }

    return cumulParSemaineSurPériodeObservée
}