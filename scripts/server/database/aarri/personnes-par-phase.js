/** @import Personne from '../../../types/database/public/Personne' */
/** @import { ÉvènementMétrique } from '../../../types/évènement.js' */

import { compareAsc, differenceInWeeks, startOfWeek } from 'date-fns';
import { ÉVÈNEMENTS_CONSULTATIONS, ÉVÈNEMENTS_MODIFICATIONS } from './constantes.js';
import { getPersonnesEtDatesQuandSeuilAtteint, getPremièreDateAtteinteDuSeuilParPersonne } from './utils.js';

/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */

/**
 * Retourne les personnes acquises et la date à laquelle elles ont été considérées comme acquises.
 * Une personne acquise est une personne qui s'est connectée au moins une fois.
 *
 * @remarks
 *
 * Pour l'instant, on considère que se connecter correspond à l'action "a cliqué sur un lien de connexion".
 * Par respect du RGPD, cet évènement sera perdu un an après son enregistrement.
 * Si c'est un problème, nous pourrons enregistrer l'évènement d'une autre manière pour ne pas perdre l'information.
 *
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>} Une liste des personnes acquises et la date à laquelle elles ont été acquises.
*/
export async function getPersonnesAcquises() {
    /** @type {[ÉvènementMétrique['type']]} */
    const évènements = ['seConnecter']
    const nombreSeuil = 1

    return getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}


/**
 * Retourne les personnes actives et la date à laquelle elles ont été considérées comme actives.
 * Une personne active est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 *
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>} Une liste des personnes actives et la date à laquelle elles ont été activées.
*/
export async function getPersonnesActives() {
    const évènements = ÉVÈNEMENTS_MODIFICATIONS
    const nombreSeuil = 5
    
    return await getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}

/**
 * Retourne les personnes dans la phae Impact et la date à laquelle elles ont été considérées dans la phase Impact.
 * L'impact de Pitchou est mesuré par les retours à conformité
 * 
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>} Une liste des personnes dans la phase Impact et la date à laquelle elles ont été considérées dans la phase Impact.
*/
export async function getPersonnesImpact() {
    /*
        Avoir de l'impact, c'est de faire au moins un contrôle qui produit un retour à la conformité
        donc un contrôle Conforme qui arrive après un contrôle qui est autre chose que Conforme
    */
    /** @type {ÉvènementMétrique['type'][]} */
    const évènements = [ 'retourÀLaConformité' ]
    const nombreSeuil = 1

    return getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}

/**
 * Retourne les personnes retenues et la date à laquelle elles ont été considérées comme retenues.
 * Une personne retenue est une personne qui renouvelle 5 actions consultation ou modification sur une semaine sur au moins 5 des 8 dernières semaines.
 * 
 * @remark
 * On décide de regarder le nombre de semaines validées sur une période de 8 semaines pour tenir compte des congés des instructrices (utilisateurices).
 * 
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>} Une liste des personnes retenues et la semaine à laquelle elles ont été considérées comme retenues.
*/
export async function getPersonnesRetenues() {
    const évènements = [...ÉVÈNEMENTS_CONSULTATIONS, ...ÉVÈNEMENTS_MODIFICATIONS]
    const nombreSemainesGlissantesÀObserver = 8
    const nombreSeuilActionsParSemaine = 5
    const nombreSeuilSemainesValidées = 5

    // Liste des personnes ayant atteint le seuil d'évènement et la semaine à laquelle cela a été atteint
    // La paire (id, semaine) doit être unique, on utilise un Map pour cela
    /** @type {{id: Personne['id'], email: Personne['email'], semaine: Date}[]} */
    const personnesEtSemaines = [
    ...new Map(
        (await getPersonnesEtDatesQuandSeuilAtteint(évènements, nombreSeuilActionsParSemaine))
        .map(({ id, email, date }) => {
            const semaine = startOfWeek(date, { weekStartsOn: 1 })
            return [`${id}-${semaine}`, { id, email, semaine }]
        })
    ).values()
    ]

    const datesSeuilAtteintParPersonne = Map.groupBy(personnesEtSemaines, (personneEtDate) => personneEtDate.id)

    /** @type {{id: Personne['id'], email: Personne['email'], semaine: Date}[]} */
    const premièreSemaineRetenuParPersonne = []

    datesSeuilAtteintParPersonne.forEach((personneEtSemaine) => {
        // On récupère les semaines "validées" et on les ordonne de la date la plus ancienne à la date la plus récente
        const semainesTriées = [...personneEtSemaine.values()].map((value) => value.semaine).sort((semaineA,semaineB) => compareAsc(semaineA, semaineB))
        // Pour chaque personne, on recherche la date la plus ancienne à laquelle elle est considérée comme retenue.
        for (let i = nombreSeuilSemainesValidées - 1 ; i < semainesTriées.length ; i++) {
            const dernièreSemaine = semainesTriées[i]
            const premièreSemaine = semainesTriées[i-nombreSeuilSemainesValidées + 1]
            // On veut la dernière semaine pour laquelle parmi les 8 précédentes semaines il y a 5 semaines retenues.
            // On veut savoir pour quelle date, la cinquième date avant date au plus tard d'il y a huit semaines.
            if (differenceInWeeks(dernièreSemaine, premièreSemaine) <= nombreSemainesGlissantesÀObserver) {
                const personneEtSemaineRetenue = personneEtSemaine[i]
                premièreSemaineRetenuParPersonne.push(personneEtSemaineRetenue)
            }
        }
    })
    return premièreSemaineRetenuParPersonne
}