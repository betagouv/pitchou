/** @import {DossierComplet} from '../types/API_Pitchou.js' */
/** @import {default as ÉvènementPhaseDossier} from '../types/database/public/ÉvènementPhaseDossier.ts' */

import {formatLocalisation, formatDéposant} from './affichageDossier.js'

/** @type {(dossiers: (DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]})[], nom_colonne: keyof DossierComplet | "localisation" | "déposant") => (DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]})[]}*/
export const trierDossiersParOrdreAlphabétiqueColonne = (dossiers, nomColonne) => {
    const nouveauxDossiersTriés = dossiers

    nouveauxDossiersTriés.sort((a, b) => {
        let colonneA
        let colonneB

        if (nomColonne === "localisation") {
            colonneA = formatLocalisation(a).trim()
            colonneB = formatLocalisation(b).trim()
        } else if (nomColonne === "déposant") {
            colonneA = formatDéposant(a).trim()
            colonneB = formatDéposant(b).trim()
        } else {
            colonneA = a[nomColonne] 
            colonneB = b[nomColonne]
        } 

        if (
            colonneA && 
            typeof colonneA === "string" &&
            colonneB &&
            typeof colonneB === "string"
        ) {
            return colonneA.trim().localeCompare(colonneB.trim(), 'fr')
        }

        if (!colonneA && colonneB) return 1
        if (colonneA && !colonneB) return -1

        return 0
    })

    return nouveauxDossiersTriés
}
