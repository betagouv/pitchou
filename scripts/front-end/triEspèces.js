/** @import {
 *    OiseauAtteint,
 *    FauneNonOiseauAtteinte,
 *    FloreAtteinte,
 *  } from '../types/especes.d.ts'
 */

/**
 *
 * @param {OiseauAtteint[]|FauneNonOiseauAtteinte[]|FloreAtteinte[]} espècesAtteintes
 * @returns {OiseauAtteint[]|FauneNonOiseauAtteinte[]|FloreAtteinte[]}
 */
export const trierParOrdreAlphabétiqueEspèce = (espècesAtteintes) => {
    return [...espècesAtteintes]
        .sort((espèceAtteinteA, espèceAtteinteB) => {
            const nomsVernaculairesA = [...espèceAtteinteA.espèce.nomsVernaculaires]
            const nomsVernaculairesB = [...espèceAtteinteB.espèce.nomsVernaculaires]

            if (
                nomsVernaculairesA.length >= 1 &&
                nomsVernaculairesA[0] !== "" &&
                nomsVernaculairesB.length >= 1
            ) {
                return nomsVernaculairesA[0].localeCompare(nomsVernaculairesB[0], 'fr')
            }

            return 0
        })
}

/**
 *
 * @param {OiseauAtteint[]|FauneNonOiseauAtteinte[]|FloreAtteinte[]} espècesAtteintes
 * @returns {OiseauAtteint[]|FauneNonOiseauAtteinte[]|FloreAtteinte[]}
 */
export const grouperParActivité = (espècesAtteintes) => {
    return [...espècesAtteintes].sort((espèceAtteinteA, espèceAtteinteB) => {
        if(espèceAtteinteA.activité && espèceAtteinteB.activité) {
            return espèceAtteinteA.activité['Libellé Pitchou'].localeCompare(espèceAtteinteB.activité['Libellé Pitchou'])
        }

        if(!espèceAtteinteA.activité && espèceAtteinteB.activité) {
            return 1
        }

        if(espèceAtteinteA.activité && !espèceAtteinteB.activité) {
            return -1
        }

        return 0
    })
}

/**
 *
 * @param {OiseauAtteint[]|FauneNonOiseauAtteinte[]} espècesAtteintes
 * @returns {OiseauAtteint[]|FauneNonOiseauAtteinte[]}
 */
export const grouperParMéthode = (espècesAtteintes) => {
    return [...espècesAtteintes].sort((espèceAtteinteA, espèceAtteinteB) => {
        if(espèceAtteinteA.méthode && espèceAtteinteB.méthode) {
            return espèceAtteinteA.méthode["Libellé Pitchou"].localeCompare(espèceAtteinteB.méthode["Libellé Pitchou"])
        }

        if(!espèceAtteinteA.méthode && espèceAtteinteB.méthode) {
            return 1
        }

        if(espèceAtteinteA.méthode && !espèceAtteinteB.méthode) {
            return -1
        }

        return 0
    })
}
