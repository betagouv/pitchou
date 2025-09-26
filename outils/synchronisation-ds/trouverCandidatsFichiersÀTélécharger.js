
/** @import {DossierDS88444, ChampDSPieceJustificative, DSFile} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */

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

        /** @type {ChampDSPieceJustificative | undefined} */
        // @ts-ignore
        const champFichier = champs.find(c => c.id === champDescriptorId) || annotations.find(c => c.id === champDescriptorId)

        const descriptionFichier = champFichier?.files

        return descriptionFichier && descriptionFichier.length >= 1 ?
            [ number, descriptionFichier ] : 
            undefined
        
    }).filter(x => x !== undefined))

    return candidatsFichiers
}

