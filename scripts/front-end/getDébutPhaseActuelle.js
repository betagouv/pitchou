//@ts-ignore
/** @import {DossierComplet, DossierPhase} from '../types/API_Pitchou.js' */
//@ts-ignore
/** @import {default as ÉvènementPhaseDossier} from '../types/database/public/ÉvènementPhaseDossier.js' */


/**
 * 
 * @param { DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]} } dossier
 * @returns { {phase: DossierPhase, dateDébut: Date}}
 */
export function getDébutPhaseActuelle(dossier){
    // C'est trop simpliste
    // PPP à revoir à l'occasion de https://trello.com/c/GmhEx16G/420-un-dossier-qui-passe-en-instruction-dans-ds-reste-en-instruction-dans-pitchou
    /** @type {DossierPhase}*/
    const phaseActuelle = dossier.évènementsPhase[0].phase

    let dateDébut;

    if(phaseActuelle === 'Accompagnement amont'){
        const {date_dépôt} = dossier

        dateDébut = date_dépôt
    }
    else{
        dateDébut = dossier.évènementsPhase[0].horodatage
    }


    return { dateDébut, phase: phaseActuelle}
}
