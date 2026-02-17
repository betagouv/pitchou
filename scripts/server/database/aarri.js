/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */
/** @import { ÉvènementMétrique } from '../../types/évènement.js' */
/** @import { PersonneId } from '../../types/database/public/Personne.js' */

import { eachWeekOfInterval } from 'date-fns';
import { directDatabaseConnection } from '../database.js';

/** @type {ÉvènementMétrique['type'][]} */
const ÉVÈNEMENTS_CONSULTATIONS= [
    'rechercherDesDossiers',
    'afficherLesDossiersSuivis',
    'consulterUnDossier',
    'téléchargerListeÉspècesImpactées'
]

/** @type {ÉvènementMétrique['type'][]} */
const ÉVÈNEMENTS_MODIFICATIONS = [
    'suivreUnDossier',
    'modifierCommentaireInstruction', 
    'changerPhase', 
    'changerProchaineActionAttendueDe', 
    'ajouterDécisionAdministrative', 
    'modifierDécisionAdministrative', 
    'supprimerDécisionAdministrative',
    'ajouterPrescription',
    'modifierPrescription',
    'supprimerPrescription',
    'ajouterContrôle',
    'modifierContrôle',
    'supprimerContrôle'
]


/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */


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
 * @returns { Promise<Map<Semaine, number>> } Une correspondance entre la date de la semaine concernée et le nombre d'acquis.e à cette date
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
 * 
 * @param {number} nombreSemainesObservées 
 * @param {ÉvènementMétrique['type'][]} évènements 
 * @param {number} seuilNombreÉvènements 
 *
 * Une correspondance entre la date de la semaine concernée et le nombre de personnes cumulées ayant 
 * atteint le seuil à cette date.
 * @returns { Promise<Map<string, number>> } 
 */
async function nombrePersonnesAyantAtteintSeuilDÉvènmentsParSemaine(nombreSemainesObservées, évènements, seuilNombreÉvènements){

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





/**
 * Calcule le nombre de personnes actives sur Pitchou pour chaque semaine sur les X dernières semaines.
 * Une personne active est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 * 
 * @param {number} nbSemainesObservées
 *
 * @returns { Promise<Map<string, number>> } Une correspondance entre la date de la semaine concernée et le nombre d'actif.ve à cette date
*/
async function calculerIndicateurActif(nbSemainesObservées) {

    /** @type {ÉvènementMétrique['type'][]} */
    const évènementsModifications = [
        'modifierCommentaireInstruction', 
        'changerPhase', 
        'changerProchaineActionAttendueDe', 
        'ajouterDécisionAdministrative', 
        'modifierDécisionAdministrative', 
        'supprimerDécisionAdministrative'
    ]
    
    return nombrePersonnesAyantAtteintSeuilDÉvènmentsParSemaine(nbSemainesObservées, évènementsModifications, 5)
}


/**
 * Calcule le nombre de personnes qui ont créé un impact sur Pitchou pour chaque semaine
 * L'impact de Pitchou est mesuré par les retours à conformité
 * 
 * @param {number} nbSemainesObservées
 *
 * Une correspondance entre la date de la semaine concernée et le nombre de personne 
 * ayant un "impact" à cette date
 * @returns { Promise<Map<string, number>> } 
*/
async function calculerIndicateurImpact(nbSemainesObservées) {
    /*
        Avoir de l'impact, c'est de faire au moins un contrôle qui produit un retour à la conformité
        donc un contrôle Conforme qui arrive après un contrôle qui est autre chose que Conforme
    */

    /** @type {ÉvènementMétrique['type'][]} */
    const évènements = [ 'retourÀLaConformité' ]
    
    return nombrePersonnesAyantAtteintSeuilDÉvènmentsParSemaine(nbSemainesObservées, évènements, 1)
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
WHERE évènement IN (:evenements)
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

    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculerIndicateurAcquis(nbSemainesObservées);
    const actifs = await calculerIndicateurActif(nbSemainesObservées);
    const retenus = await calculerIndicateurRetenu()
    const impacts = await calculerIndicateurImpact(nbSemainesObservées);

    const dates = acquis.keys();

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
