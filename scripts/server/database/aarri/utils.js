
/** @import Évènement from '../../../types/database/public/ÉvènementMétrique' */
/** @import Personne from '../../../types/database/public/Personne' */
/** @import { ÉvènementMétrique } from '../../../types/évènement.js' */


import { format, startOfWeek } from 'date-fns'
import { directDatabaseConnection } from '../../database'
import { ÉVÈNEMENTS_MODIFICATIONS } from './constantes.js';

/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */


/**
 * 
 * @param {Évènement[]} évènements 
 * @returns {Date | null}
 */
export function getPremièreSemaineActivéFromÉvènements(évènements) {
    const seuilNombreActionsParSemaine = 5

    // On ne s'intéresse qu'aux évènements de modifications et on veut les trier de la date la plus récente vers la plus ancienne.
    // @ts-ignore
    const évènementsFiltrésEtOrdonnés = évènements.filter(({évènement}) => (ÉVÈNEMENTS_MODIFICATIONS.includes(évènement))).sort((a,b) => a.date > b.date ? 1 : -1)

    /** @type {Record<string, number>} */
    const nombreÉvènementsParSemaine = {}

    for (const item of évènementsFiltrésEtOrdonnés) {
        const semaine = startOfWeek(item.date, {
            weekStartsOn: 1
        })
        const key = format(semaine, 'yyyy-MM-dd')
        if (!nombreÉvènementsParSemaine[key]) {
            nombreÉvènementsParSemaine[key] = 0
        }
        nombreÉvènementsParSemaine[key]+=1
    }


    for (const semaine of Object.keys(nombreÉvènementsParSemaine)) {
        if (nombreÉvènementsParSemaine[semaine] >= seuilNombreActionsParSemaine) {
            return new Date(semaine)
        }
    }
    
    return null;
}


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
 * @param {Personne['email']} email
 * @returns {Promise<{évènement: string, count: number}[]>} 
 */
export async function getÉvènementsCountForPersonne(email) {
    const requêteSQL = await directDatabaseConnection('personne')
        .select('id')
        .where('email', '=', email)

    if (!(requêteSQL && Array.isArray(requêteSQL) && requêteSQL.length >=1 && requêteSQL[0].id)) {
        throw new Error(`Aucun id n'a été trouvé pour l'email ${email}.`)
    }

    const personneId = requêteSQL[0].id
    
    const évènementsCount = await directDatabaseConnection('évènement_métrique')
        .select('évènement')
        .count('évènement')
        .where('personne', '=', personneId)
        .groupBy('évènement')

    return évènementsCount.map((row) => ({ évènement: String(row.évènement), count: Number(row.count)}) )
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
 * 
 * @param {number} nombreSemainesObservées 
 * @param {ÉvènementMétrique['type'][]} évènements 
 * @param {number} seuilNombreÉvènements 
 *
 * Une correspondance entre la date de la semaine concernée et le nombre de personnes cumulées ayant 
 * atteint le seuil à cette date.
 * @returns { Promise<Map<string, number>> } 
 */
export async function nombrePersonnesAyantAtteintSeuilDÉvènmentsParSemaine(nombreSemainesObservées, évènements, seuilNombreÉvènements){

    const requêteSQL = `
-- personnes et le nombre évènement suivis par semaine
with actions_par_personne as (select
    personne,
    COUNT(évènement) as nombre_actions,
    date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenements)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, semaine),

-- filtrer par première fois où le seuil est atteint
premiere_fois_seuil_atteint as (select personne, min(semaine) as semaine
from actions_par_personne
WHERE nombre_actions >= :nb_seuil_actions
group by personne),

-- nombre actif par semaine
nombre_personnes_par_semaine as (select
    count(personne) as nombre_personne_pour_cette_semaine,
    semaine
from premiere_fois_seuil_atteint
group by semaine),

-- récupérer la liste de toutes les semaines avec sûr les nb_semaines_observees dernières semaines
semaines as (
    select
        date_trunc('week', semaine)::date as semaine
    from
        generate_series(now() - (:nb_semaines_observees || ' weeks')::interval, now(), '7 days'::interval) as semaine
    union
    select semaine from premiere_fois_seuil_atteint
)

select
    semaines.semaine as date,
    sum(nombre_personne_pour_cette_semaine) over (order by semaines.semaine  asc) as quantite_personnes
from
    nombre_personnes_par_semaine
right join
    semaines
on semaines.semaine = nombre_personnes_par_semaine.semaine
order by date desc
limit :nb_semaines_observees; 
        `;

    const personnesParSemaines = await directDatabaseConnection.raw(requêteSQL, {
        nb_semaines_observees: nombreSemainesObservées,
        nb_seuil_actions: seuilNombreÉvènements,
        evenements: directDatabaseConnection.raw(évènements.map(() => '?').join(', '), évènements)
    })

    return new Map(
        ...[personnesParSemaines.rows.map(
            (/** @type {any} */ row) => [row.date.toISOString(), Number(row.quantite_personnes)]
        )]
    )
}


