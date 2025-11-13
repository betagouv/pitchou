
/** @import {DossierDS88444, ChampDSPieceJustificative, DSFile, ChampRépétéDSPieceJustificative} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */

import {isChampDSPieceJustificative, isChampRépétéDSPieceJustificative} from '../../scripts/types/typeguards.js';

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {DossierDS88444[]} dossiers 
 * @param {ChampDescriptor['id']} champDescriptorId
 * @returns {Map<DossierDS88444['number'], DSFile[]>}
 */
export default function trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId){
    /** @type {ReturnType<trouverCandidatsFichiersÀTélécharger>} */
    // @ts-ignore
    const candidatsFichiers = new Map(dossiers.map(({number, champs, annotations}) => {

        /** @type {ChampDSPieceJustificative | ChampRépétéDSPieceJustificative | undefined} */
        // @ts-ignore
        const champFichier = champs.find(c => c.id === champDescriptorId) || annotations.find(c => c.id === champDescriptorId)

        /** @type {DSFile[] | undefined} */
        let descriptionFichiers;

        if(isChampDSPieceJustificative(champFichier)){
            descriptionFichiers = champFichier.files
        }

        if(isChampRépétéDSPieceJustificative(champFichier)){
            descriptionFichiers = champFichier.rows.map(r => r.champs.map(c => c.files)).flat(2)
        }

        return descriptionFichiers && descriptionFichiers.length >= 1 ?
            [ number, descriptionFichiers ] : 
            undefined
        
    }).filter(x => x !== undefined))

    return candidatsFichiers
}

