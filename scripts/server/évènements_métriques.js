//@ts-check

/** @import { ÉvènementMétrique, ÉvènementRechercheDossiersDétails } from '../types/évènement' */
/** @import { FastifyReply, FastifyRequest } from 'fastify' */


// @ts-expect-error 'ÉvènementRechercheDossiersDétails' est considéré inutilisé sinon
const /** @type {ÉvènementRechercheDossiersDétails} **/ inutile = null;

import { ajouterÉvènementDepuisCap } from './database/évènements_métriques.js';


/**
* @param {any} détails
* @returns { détails is {dossierId: Dossier['id']} }
*/
function estDétailsDossier(détails) {
    if (Object(détails) === détails) {
        return Number.isInteger(détails.dossierId)
    }
    else{
        return false
    }
}
/**
* @param {any} détails
* @returns { détails is ÉvènementRechercheDossiersDétails }
*/
function estRechercheDossierDétails(détails) {
    if (Object(détails) !== détails) {
        return false
    }

    if (typeof détails.nombreRésultats !== 'number') {
        return false
    }

    if (!détails.filtres) {
        return false
    }

    const filtres = détails.filtres

    if (filtres.suiviPar) {
        const suiviPar = filtres.suiviPar
        const estSuiviPar = (
            typeof suiviPar.nombreSéléctionnées === 'number' &&
            typeof suiviPar.nombreTotal === 'number' &&
            typeof suiviPar.inclusSoiMême === 'boolean'
        )

        if (!estSuiviPar) {
            return false
        }
    }

    if (
        filtres.sansInstructeurice !== undefined &&
        typeof filtres.sansInstructeurice !== 'boolean'
    ) {
        return false
    }

    if (
        filtres.texte !== undefined &&
        typeof filtres.texte !== 'string'
    ) {
        return false
    }

    if (
        filtres.activitésPrincipales &&
        Array.isArray(filtres.activitésPrincipales)
    ) {
        const estActivitésPrincipales = filtres.activitésPrincipales.every(
            (/** @type {any} */ activité) => typeof activité === 'string'
        )

        if (!estActivitésPrincipales) {
            return false
        }
    }

    if (filtres.phases && Array.isArray(filtres.phases)) {
        const phases = [
            "Accompagnement amont",
            "Étude recevabilité DDEP",
            "Instruction",
            "Contrôle",
            "Classé sans suite",
            "Obligations terminées",
        ]
        const estPhases = filtres.phases.every(
            ( /** @type {any} */ peutÊtrePhase) => {
                return phases.find(phase => phase == peutÊtrePhase)
            }
        )
        if (!estPhases) {
            return false
        }
    }

    if (
        filtres.prochaineActionAttenduePar &&
        Array.isArray(filtres.prochaineActionAttenduePar))
    {
        const typesDePersonne = [
            "Instructeur",
            "CNPN/CSRPN",
            "Pétitionnaire",
            "Consultation du public",
            "Autre administration",
            "Autre",
            "Personne",
            "(vide)",
        ]
        const estProchaineActionAttenduePar = filtres.prochaineActionAttenduePar.every(
            ( /** @type {any} */ peutÊtreTypeDePersonne) => {
                return typesDePersonne.find(typeDePersonne => typeDePersonne == peutÊtreTypeDePersonne)
            }
        )
        if (!estProchaineActionAttenduePar) {
            return false
        }
    }

    return true
}

/**
* @param {any} évènement
* @returns { évènement is ÉvènementMétrique }
*/
function évènementMétriqueGuard(évènement) {
    if (!évènement.type) {
        return false
    }

    /** @type {ÉvènementMétrique['type']} */
    const type = évènement.type

    switch (type) {
        case 'seConnecter':
            return !('détails' in évènement)
        case 'suivreUnDossier':
            return estDétailsDossier(évènement.détails)
        case 'rechercherDesDossiers':
            return estRechercheDossierDétails(évènement.détails)
        case 'modifierCommentaireInstruction':
            return !('détails' in évènement)
        case 'afficherLesDossiersSuivis':
            return !('détails' in évènement)
        case 'consulterUnDossier':
            return estDétailsDossier(évènement.détails)
        case 'téléchargerListeÉspècesImpactées':
            return estDétailsDossier(évènement.détails)
        default: {
            // Pour que TypeScript détecte si on a oublié un 'case'
            /** @type {never} */
            const neverType = type

            // faire semblant d'utiliser pour pour satisfaire TypeScript
            void neverType

            console.error(`le type d'événement '${type}' est inconnu`)
            return false
        }
    }
}

/**
* @param {FastifyRequest} request
* @param {FastifyReply} reply
*/
export async function créerÉvènementMétrique(request, reply) {
    // @ts-ignore
    const { cap } = request.query

    if(!cap){
        reply.code(400).send({succès: false, erreur: `Paramètre 'cap' manquant dans l'URL`})
        return
    }

    /** @type {any} */
    // @ts-ignore
    const évènement = request.body

    if (!évènementMétriqueGuard(évènement)) {
        reply.code(400).send({succès: false, erreur: `Objet évènement mal formé`})
        return
    }

    try {
        await ajouterÉvènementDepuisCap(cap, évènement);
    } catch (e) {
        // TODO: améliorer la gestion d’erreur ici
        console.error(e)
    }

    reply.send({succès: true})
}
