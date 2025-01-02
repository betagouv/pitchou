import {extname} from 'node:path';


/** @import {DossierDS88444, DSPieceJustificative} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {EspCesImpactEsMutator } from '../../scripts/types/database/public/EspècesImpactées.ts' */
/** @import {Knex} from 'knex' */

const openDocumentTypes = new Map([
    ['.odt', 'application/vnd.oasis.opendocument.text'],
    ['.ott', 'application/vnd.oasis.opendocument.text-template'],
    ['.ods', 'application/vnd.oasis.opendocument.spreadsheet'],
    ['.ots', 'application/vnd.oasis.opendocument.spreadsheet-template'],
    ['.odp', 'application/vnd.oasis.opendocument.presentation'],
    ['.otp', 'application/vnd.oasis.opendocument.presentation-template'],
    ['.odg', 'application/vnd.oasis.opendocument.graphics'],
    ['.otg', 'application/vnd.oasis.opendocument.graphics-template'],
    ['.odf', 'application/vnd.oasis.opendocument.formula'],
    ['.odm', 'application/vnd.oasis.opendocument.text-master'],
    ['.odb', 'application/vnd.oasis.opendocument.database'],
    ['.odi', 'application/vnd.oasis.opendocument.image'],
    ['.odc', 'application/vnd.oasis.opendocument.chart'],
    ['.otf', 'application/vnd.oasis.opendocument.formula-template'],
    ['.oth', 'application/vnd.oasis.opendocument.text-web']
  ]);

/**
 * Contournement de https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/11175
 * 
 * @param {Pick<DSPieceJustificative, 'contentType' | 'filename'>} contentType 
 * @return {string}
 */
function DScontentTypeToActualMediaType({contentType, filename}){
    const extension = extname(filename)
    
    if(contentType === 'application/zip'){
        const type = openDocumentTypes.get(extension)
        if(type)
            return type
    }

    return contentType
}

/**
 * 
 * @param {Map<DossierDS88444['number'], DSPieceJustificative>} candidatsFichiersImpactées 
 * @param {Knex.Transaction | Knex} [transaction]
 */
export default function téléchargerNouveauxFichiersEspècesImpactées(candidatsFichiersImpactées, transaction){
    /** @type {Map<DossierDS88444['number'], EspCesImpactEsMutator & {url: string}>} */
    const candidatsFichiersImpactéesFormatBDD = new Map(
        [...candidatsFichiersImpactées].map(([number, {filename, contentType, checksum, createdAt, url}]) => {
            return [
                number,
                {
                    nom: filename,
                    media_type: DScontentTypeToActualMediaType({filename, contentType}),
                    DS_checksum: checksum,
                    DS_createdAt: new Date(createdAt),
                    url
                }
            ]
        })
    )

    console.log('candidatsFichiersImpactéesFormatBDD', candidatsFichiersImpactéesFormatBDD)

    // Chercher dans la base de données les fichiers que nous avons déjà et qui ressemblent aux candidats

    // Filtrer la liste des candidats

    // Télécharger les fichiers et les mettre dans un format prêt à être insérés en BDD (mais qui n'a pas de Dossier.id)
}