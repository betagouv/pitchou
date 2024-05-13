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


/**
 * @typedef {Object} PitchouState
 * @property {string} [secret]
 */

/** @type {PitchouState} */
const state = {
  secret: undefined
}

const mutations = {
  /**
   * @param {PitchouState} state
   * @param {PitchouState['secret']} secret
   */
  setSecret(state, secret) {
    state.secret = secret
  }
}

/** @typedef { typeof mutations } PitchouMutations */

/** @type { import('baredux').BareduxStore<PitchouState, PitchouMutations> } */
const store = Store({ state, mutations })

export default store
