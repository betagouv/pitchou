//@ts-ignore
/** @import {DossierComplet, DossierPhase, DossierRésumé} from '../types/API_Pitchou.js' */
//@ts-ignore
/** @import {default as ÉvènementPhaseDossier} from '../types/database/public/ÉvènementPhaseDossier.js' */


/**
 * 
 * @param { DossierRésumé } dossier
 * @returns { {phase: DossierPhase, dateDébut: Date}}
 */
export function getDébutPhaseActuelle(dossier){
    // C'est trop simpliste
    // PPP à revoir à l'occasion de https://trello.com/c/GmhEx16G/420-un-dossier-qui-passe-en-instruction-dans-ds-reste-en-instruction-dans-pitchou
    /** @type {DossierPhase}*/
    const phaseActuelle = dossier.phase

    /** @type {Date} */
    let dateDébut;

    if(phaseActuelle === 'Accompagnement amont'){
        dateDébut = dossier.date_dépôt
    }
    else{
        dateDébut = dossier.date_début_phase
    }


    return { dateDébut, phase: phaseActuelle}
}
