//@ts-check

import { ajouterÉvènementDepuisCap } from './database/évènements_métriques.js';

/** @import { ÉvènementMétrique } from '../types/évènement' */

/**
 * @param {any} évènement
 * @returns { évènement is ÉvènementMétrique }
 */
function évènementMétriqueGuard(évènement) {
  if (!évènement.type) {
    return false
  }

  switch (évènement.type) {
    case 'seConnecter':
      return true;
    case 'suivreUnDossier':
      if (typeof évènement.détails === 'object') {
        return Number.isInteger(évènement.détails.dossierId)
      }
  }

  return false
}

export async function créerÉvènementMétrique(request, reply) {
    const { cap } = request.query

    if(!cap){
      reply.code(400).send({succès: false, erreur: `Paramètre 'cap' manquant dans l'URL`})
      return
    }

    /** @type {any} */
    // @ts-ignore
    const évènement = request.body

    if (!évènementMétriqueGuard(évènement)) {
      reply.code(400).send({succès: false, erreur: `Object évènement mal formé`})
      return
    }

    try {
      await ajouterÉvènementDepuisCap(cap, évènement);
    } catch (e) {
      // TODO: améliorer la gestion d’erreur ici
      console.error(e)
    }

    reply.code(202).send({succès: true})

}
