
/** @import {DossierDS88444, ChampDSPieceJustificative, DSPieceJustificative} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {DossierDS88444[]} dossiers 
 * @param {ChampDescriptor['id']} champDescriptorId
 * @returns {Map<DossierDS88444['number'], DSPieceJustificative>}
 */
export default function trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId){
    /** @type {ReturnType<trouverCandidatsFichiersÀTélécharger>} */
    // @ts-ignore
    const candidatsFichiers = new Map(dossiers.map(({number, champs, annotations}) => {

        /** @type {ChampDSPieceJustificative | undefined} */
        // @ts-ignore
        const champFichier = champs.find(c => c.id === champDescriptorId) || annotations.find(c => c.id === champDescriptorId)

        // ne garder que le premier fichier et ignorer les autres
        const descriptionFichier = champFichier?.files[0]

        if(descriptionFichier){
            return [
                number,
                descriptionFichier
            ]
        }
        else{
            return undefined
        }
        
    }).filter(x => x !== undefined))

    return candidatsFichiers
}

