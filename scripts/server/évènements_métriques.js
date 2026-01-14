//@ts-check

/** @import { ÉvènementMétrique } from '../types/évènement' */
/** @import { FastifyReply, FastifyRequest } from 'fastify' */


import { ajouterÉvènementDepuisCap } from './database/évènements_métriques.js';

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
      return !('details' in évènement)
    case 'suivreUnDossier':
      if (typeof évènement.détails === 'object') {
        return Number.isInteger(évènement.détails.dossierId)
      }
      else{
        return false
      }
    case 'rechercherDesDossiers':
      return !('details' in évènement)
    case 'modifierCommentaireInstruction': {
      return !('details' in évènement)
    }
    case 'afficherLesDossiersSuivis':
      return !('details' in évènement)
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
