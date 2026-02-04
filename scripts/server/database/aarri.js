/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */
/** @import { ÉvènementMétrique } from '../../types/évènement.js' */
/** @import {PersonneId} from '../../types/database/public/Personne.js' */


import {directDatabaseConnection} from '../database.js'



/**
 * Calcule le nombre de personnes acquises sur Pitchou pour chaque semaine sur les 5 dernières semaines.
 * Une personne acquise pendant est une personne qui s'est connectée au moins une fois.
 * 
 * @param {number} nbSemainesObservées
 *
 * @remarks
 *
 * Pour l'instant, on considère que se connecter correspond à l'action "a cliqué sur un lien de connexion".
 * Par respect du RGPD, cet évènement sera perdu un an après son enregistrement.
 * Si c'est un problème, nous pourrons enregistrer l'évènement d'une autre manière pour ne pas perdre l'information.
 *
 * @returns { Promise<Map<string, number>> } Une correspondance entre la date de la semaine concernée et le nombre d'acquis.e à cette date
*/
async function calculerIndicateurAcquis(nbSemainesObservées) {
    const acquis = await directDatabaseConnection.raw(`
        with premiere_connexion as (
            select
                personne,
                min(date) as date
            from évènement_métrique
            join personne on personne.id = évènement_métrique.personne
            where évènement = 'seConnecter'
            and personne.email NOT ILIKE '%@beta.gouv.fr'
            group by personne
        ),
        nombre_premiere_connexion_par_semaine as (
            select
                count(personne) as acquis_semaine,
                date_trunc('week', date)::date as semaine
            from premiere_connexion
            group by semaine
        ),
        semaines as (
            select
                date_trunc('week', semaine)::date as semaine
            from
                generate_series(now() - (:nb_semaines_observees || ' weeks')::interval, now(), '7 days'::interval) as semaine
            union
            select semaine from nombre_premiere_connexion_par_semaine
        )
        select
            semaines.semaine as date,
            sum(acquis_semaine) over (order by semaines.semaine  asc) as acquis_total
        from
            nombre_premiere_connexion_par_semaine
        right join
            semaines
        on semaines.semaine = nombre_premiere_connexion_par_semaine.semaine
        order by date desc
        limit :nb_semaines_observees; 
    `,
{
    nb_semaines_observees: nbSemainesObservées,
});

    return new Map(
        ...[acquis.rows.map(
            (/** @type {any} */ row) => [row.date.toISOString(), Number(row.acquis_total)]
        )]
    )
}

/**
 * Calcule le nombre de personnes actives sur Pitchou pour chaque semaine sur les X dernières semaines.
 * Une personne active pendant est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 * 
 * @param {number} nbSemainesObservées
 *
 * @returns { Promise<Map<string, number>> } Une correspondance entre la date de la semaine concernée et le nombre d'actif.ve à cette date
*/
async function calculerIndicateurActif(nbSemainesObservées) {

    /** @type {ÉvènementMétrique['type'][]} */
    const évènementsModifications = ['modifierCommentaireInstruction', 'changerPhase', 'changerProchaineActionAttendueDe', 'ajouterDécisionAdministrative', 'modifierDécisionAdministrative', 'supprimerDécisionAdministrative']
    
    const actifs = await directDatabaseConnection.raw(`
        -- personnes et le nombre évènement d'action de modif par semaine
with actions_modif_par_personne as (select
	personne,
	COUNT(évènement) as nombre_actions_modif,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenement_modifs)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, semaine),

-- filtrer par première fois activé
premiere_fois_active as (select personne, min(semaine) as semaine
from actions_modif_par_personne
WHERE nombre_actions_modif >= :nb_seuil_actions_modif
group by personne),

-- nombre actif par semaine
nombre_active_par_semaine as (select
	count(personne) as actif_semaine,
	semaine
from premiere_fois_active
group by semaine),

-- récupérer la liste de toutes les semaines avec sûr les cinq dernières semaines
semaines as (
	select
		date_trunc('week', semaine)::date as semaine
	from
		generate_series(now() - (:nb_semaines_observees || ' weeks')::interval, now(), '7 days'::interval) as semaine
	union
	select semaine from premiere_fois_active
)

select
	semaines.semaine as date,
	sum(actif_semaine) over (order by semaines.semaine  asc) as actifs_total
from
	nombre_active_par_semaine
right join
	semaines
on semaines.semaine = nombre_active_par_semaine.semaine
order by date desc
limit :nb_semaines_observees; 
        `, {
            nb_semaines_observees: nbSemainesObservées,
            nb_seuil_actions_modif: 5,
            evenement_modifs: directDatabaseConnection.raw(
                évènementsModifications.map(() => '?').join(', '), évènementsModifications)

        })

    return new Map(
        ...[actifs.rows.map(
            (/** @type {any} */ row) => [row.date.toISOString(), Number(row.actifs_total)]
        )]
    )
}

/**
 * Correspond au jour d'une semaine
 * @typedef {Date} Semaine
 */

/**
 * @param {number} nombreSeuilActions
*/
async function calculerIndicateurRetenu(nombreSeuilActions) {

    /** @type {ÉvènementMétrique['type'][]} */
    const évènementsModifications = ['modifierCommentaireInstruction', 'changerPhase', 'changerProchaineActionAttendueDe', 'ajouterDécisionAdministrative', 'modifierDécisionAdministrative', 'supprimerDécisionAdministrative']
    /** @type {ÉvènementMétrique['type'][]} */
    const évènementsConsultations= ['rechercherDesDossiers']

    const évènements = [...évènementsModifications, ...évènementsConsultations]
    
    const result = await directDatabaseConnection.raw(`
        -- personnes et le nombre évènement d'action de modif/consult par semaine
select
	personne,
	COUNT(évènement) as nombre_actions,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
WHERE évènement IN (:evenements)
group by personne, semaine;
        `, {
            evenements: directDatabaseConnection.raw(
                évènements.map(() => '?').join(', '), évènements)

        })
    /**@type {{personne: PersonneId, nombre_actions: number, semaine: Semaine}[]} */
    const résultatsFormattés = result.rows.map((/** @type {any} */ row) => ({personne: Number(row.personne), nombre_actions: Number(row.nombre_actions), semaine: row.semaine}))

    /**@type {Map<PersonneId, Map<Semaine, number>>} */
    const résultatsParPersonne = new Map()

    for (const {personne, nombre_actions, semaine} of résultatsFormattés) {
        /** @type {Map<Semaine, number>} */
        const nombreActionsParSemaine = résultatsParPersonne.get(personne) || new Map()
        nombreActionsParSemaine.set(semaine, nombre_actions)

        résultatsParPersonne.set(personne, nombreActionsParSemaine)
    }

    // Pour chaque personne, identifier la première semaine où elle a été retenue.
    /** @type {Map<PersonneId, Semaine>} */
    const premièreSemaineRetenuParPersonne = new Map()

    résultatsParPersonne.forEach((nombreActionsParSemaine, personne) => {
        /** @type {[Semaine, number][]} */
        const nombreActionsParSemaineRetenu = [...nombreActionsParSemaine]
            .filter((nombreActionsSemaine) => nombreActionsSemaine[1] >= nombreSeuilActions)
            .sort((nombreActionsSemaine1,nombreActionsSemaine2) => nombreActionsSemaine1[1] - nombreActionsSemaine2[1])
        
        if (nombreActionsParSemaineRetenu.length>=1) {
            premièreSemaineRetenuParPersonne.set(personne, nombreActionsParSemaineRetenu[0][0])       
        }

    })

    console.log('premièreSemaineRetenuParPersonne', premièreSemaineRetenuParPersonne)
    //Puis, faire un regroupement par semaine pour déterminer le nobmre de personnes retenues à cette semaine là.
    //Puis, faire le cumul par semaine 
}


/**
 * @returns {Promise<IndicateursAARRI[]>}
 */
export async function indicateursAARRI() {
    const nombreSeuilActionsRetenu = 5
    const nbSemainesObservées = 5

    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculerIndicateurAcquis(nbSemainesObservées);
    const actifs = await calculerIndicateurActif(nbSemainesObservées);
    calculerIndicateurRetenu(nombreSeuilActionsRetenu)

    const dates = acquis.keys();

    for (const date of dates) {
        indicateurs.push({
            date: date,
            nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
            nombreUtilisateuriceActif: actifs.get(date) ?? 0,
            nombreUtilisateuriceImpact: 0,
            nombreUtilisateuriceRetenu: 0,
            nombreBaseUtilisateuricePotentielle: 300,
        })
    }

    return indicateurs
}
