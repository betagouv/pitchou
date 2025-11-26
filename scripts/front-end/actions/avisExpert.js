/** @import { AvisExpertInitializer } from "../../types/database/public/AvisExpert" */

import { json } from "d3-fetch";


/**
 * @param {AvisExpertInitializer | AvisExpertInitializer[]} avisExpert
 */
export function ajouterAvisExpert(avisExpert) {
    return json('/avis-expert',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(avisExpert)
            }
        )
}