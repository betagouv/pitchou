
/** @import Dossier from '../../types/database/public/Dossier.ts' */
/** @import Personne from '../../types/database/public/Personne.ts' */

/**
 * 
 * @param {NonNullable<Personne['email']>} instructeur 
 * @param {Dossier['id']} dossier 
 */
export function instructeurSuitDossier(instructeur, dossier){
    const modifierSuivi = store.state.cap.modifierSuivi

    if(!modifierSuivi){
        throw new Error()
    }


    throw `à continuer`
}