
import store from '../store.js'

/** @import Dossier from '../../types/database/public/Dossier.ts' */
/** @import Personne from '../../types/database/public/Personne.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {NonNullable<Personne['email']>} instructeurEmail 
 * @param {Dossier['id']} dossierId 
 */
export function instructeurSuitDossier(instructeurEmail, dossierId){
    const modifierRelationSuivi = store.state.capabilities.modifierRelationSuivi

    if(!modifierRelationSuivi){
        throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`)
    }

    return modifierRelationSuivi("suivre", instructeurEmail, dossierId)
}

/**
 * 
 * @param {NonNullable<Personne['email']>} instructeurEmail 
 * @param {Dossier['id']} dossierId 
 */
export function instructeurLaisseDossier(instructeurEmail, dossierId){
    const modifierRelationSuivi = store.state.capabilities.modifierRelationSuivi

    if(!modifierRelationSuivi){
        throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`)
    }

    return modifierRelationSuivi("laisser", instructeurEmail, dossierId)
}