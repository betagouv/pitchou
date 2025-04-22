//@ts-expect-error https://github.com/microsoft/TypeScript/issues/60908
/** @import {default as Fichier} from '../../types/database/public/Fichier.ts' */

/**
 * Fonction qui créé une clef unique pour la valeur de son argument
 * 
 * @param {Partial<Fichier>} espèceImpactée 
 * @returns {string}
 */
export function makeFichierHash(espèceImpactée){
    return [
        espèceImpactée.DS_checksum,
        espèceImpactée.DS_createdAt?.toISOString(),
        espèceImpactée.nom,
        espèceImpactée.media_type
    ].join('-')
}