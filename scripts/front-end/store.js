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


/** @import {DossierComplet} from '../types/API_Pitchou.d.ts' */
/** @import {SchemaDémarcheSimplifiée} from '../types/démarches-simplifiées/schema.ts' */
/** @import {PitchouInstructeurCapabilities, IdentitéInstructeurPitchou} from '../types/capabilities.d.ts' */
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant} from '../types/especes.d.ts' */
/** @import {default as Message} from '../types/database/public/Message.ts' */
/** @import {default as Dossier} from '../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../types/database/public/Personne.ts' */
/** @import {default as ÉvènementPhaseDossier} from '../types/database/public/ÉvènementPhaseDossier.ts' */


/**
 * @typedef {Object} PitchouState
 * @property {PitchouInstructeurCapabilities} [capabilities]
 * @property {Map<DossierComplet['id'], DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]}>} dossiers
 * @property {Map<DossierComplet['id'], Message[]>} messagesParDossierId 
 * @property {Map<NonNullable<Personne['email']>, Set<Dossier['id']>>} [relationSuivis]
 * @property {IdentitéInstructeurPitchou} [identité]
 * @property {SchemaDémarcheSimplifiée} [schemaDS88444]
 * @property {ParClassification<EspèceProtégée[]>} [espècesProtégéesParClassification]
 * @property {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} [espèceByCD_REF]
 * @property { {activités: ParClassification<Map<ActivitéMenançante['Code'], ActivitéMenançante>>, méthodes: ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>, transports: ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} } [activitésMéthodesTransports]
 * @property { Set<{message: string}> } erreurs
 */



/** @type {PitchouState} */
const state = {
  dossiers: new Map(),
  messagesParDossierId: new Map(),
  erreurs: new Set()
}

const mutations = {
  /**
   * @param {PitchouState} state
   * @param {PitchouState['capabilities']} capabilities
   */
  setCapabilities(state, capabilities) {
    state.capabilities = capabilities
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
   * @param {DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]}} nouveauDossier
   */
  setDossier(state, nouveauDossier) {
    state.dossiers.set(nouveauDossier.id, nouveauDossier)
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['relationSuivis']} relationSuivis
   */
  setRelationSuivis(state, relationSuivis) {
    state.relationSuivis = relationSuivis
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['identité']} identité
   */
  setIdentité(state, identité) {
    state.identité = identité
  },
  /**
   * @param {PitchouState} state
   * @param {DossierComplet['id']} id
   * @param {Message[]} messages
   */
  setMessages(state, id, messages) {
    state.messagesParDossierId.set(id, messages)
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['schemaDS88444']} schemaDS88444
   */
  setSchemaDS88444(state, schemaDS88444) {
    state.schemaDS88444 = schemaDS88444
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['espècesProtégéesParClassification']} espècesProtégéesParClassification
   */
  setEspècesProtégéesParClassification(state, espècesProtégéesParClassification) {
    state.espècesProtégéesParClassification = espècesProtégéesParClassification
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['espèceByCD_REF']} espèceByCD_REF
   */
  setEspèceByCD_REF(state, espèceByCD_REF) {
    state.espèceByCD_REF = espèceByCD_REF
  },
  /**
   * @param {PitchouState} state
   * @param {PitchouState['activitésMéthodesTransports']} activitésMéthodesTransports
   */
  setActivitésMéthodesTransports(state, activitésMéthodesTransports) {
    state.activitésMéthodesTransports = activitésMéthodesTransports
  },
  /**
   * @param {PitchouState} state
   * @param {{message: string}} erreur
   */
  ajouterErreur(state, erreur) {
    state.erreurs = new Set([erreur, ...state.erreurs])
  },
  /**
   * @param {PitchouState} state
   * @param {{message: string}} erreur
   */
  enleverErreur(state, erreur){
    state.erreurs.delete(erreur)
  }
}

/** @typedef { typeof mutations } PitchouMutations */

/** @type { import('baredux').BareduxStore<PitchouState, PitchouMutations> } */
const store = Store({ state, mutations })

export default store
