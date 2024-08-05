//@ts-check

import Store from 'baredux'
/**
 * Un store baredux a pour vocation de refléter notamment le modèle mental de la 
 * personne face à notre application. Le store stocke donc principalement des données (et parfois des singletons)
 * Il stocke aussi parfois des promesses (pour permettre d'afficher des loaders dans les composants)
 * 
 * Dans un store Baredux, les mutations sont synchrones
 * S'il manque des informations, attendre la résolution de la promesse avant d'appeler une mutation
 * (à moins que la valeur soit délibérément une promesse)
 * 
 */
// DO NOT import x from 'remember' // do it in an action instead
// DO NOT import x from './actions/*.js' // you're making an action, so add an action instead

import '../types.js'

/** @typedef {import('../types/database/public/Personne.js').default} Personne */
/** @typedef {import('../types/database/public/Dossier.js').default} Dossier */


/**
 * @typedef {Object} PitchouState
 * @property {Personne['code_accès']} [secret]
 * @property {Record<Dossier['id'], Dossier>} [dossiers] // pas vraiment des Dossier vu que venant d'un join
 * @property {Object} [schemaDS88444]
 */

/** @type {PitchouState} */
const state = {
  secret: undefined,
  dossiers: undefined
}

const mutations = {
  /**
   * @param {PitchouState} state
   * @param {PitchouState['secret']} secret
   */
  setSecret(state, secret) {
    state.secret = secret
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['dossiers']} dossiers
   */
  setDossiers(state, dossiers) {
    state.dossiers = dossiers
  },
  /**
   * @param {PitchouState} state
   * @param {Dossier} nouveauDossier
   */
  setDossier(state, nouveauDossier) {
    if (!state.dossiers) { state.dossiers = {} }

    state.dossiers[nouveauDossier.id] = nouveauDossier
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['schemaDS88444']} schemaDS88444
   */
  setSchemaDS88444(state, schemaDS88444) {
    state.schemaDS88444 = schemaDS88444
  }
}

/** @typedef { typeof mutations } PitchouMutations */

/** @type { import('baredux').BareduxStore<PitchouState, PitchouMutations> } */
const store = Store({ state, mutations })

export default store
