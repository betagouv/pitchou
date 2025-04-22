import {extname} from 'node:path';
import { trouverFichiersEspècesImpactéesExistants } from '../../scripts/server/database/espèces_impactées.js';
import téléchargerFichierDS from './téléchargerFichierDS.js';

/** @import {DossierDS88444, DSPieceJustificative} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {FichierMutator, default as Fichier} from '../../scripts/types/database/public/Fichier.ts' */
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
 * Fonction qui créé une clef unique pour la valeur de son argument
 * 
 * @param {Partial<Fichier>} espèceImpactée 
 * @returns {string}
 */
function makeEspèceImpactéeHash(espèceImpactée){
    return [
        espèceImpactée.DS_checksum,
        espèceImpactée.DS_createdAt?.toISOString(),
        espèceImpactée.nom,
        espèceImpactée.media_type,
    ].join('-')
}

/**
 * Cette fonction lance tous les téléchargements d'un coup et retourne tous les résultats en un seul bloc
 * 
 * @param {Map<DossierDS88444['number'], DSPieceJustificative>} candidatsFichiersImpactées 
 * @param {Knex.Transaction | Knex} [transaction]
 * @returns {Promise<Map<DossierDS88444['number'], Partial<Fichier>>>}
 */
export default async function téléchargerNouveauxFichiersEspècesImpactées(candidatsFichiersImpactées, transaction){
    /** @type {Map<DossierDS88444['number'], FichierMutator & {url?: string}>} */
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

    // Chercher dans la base de données les fichiers que nous avons déjà et qui ressemblent aux candidats
    const fichiersDéjaEnBDD = await trouverFichiersEspècesImpactéesExistants(
        [...candidatsFichiersImpactéesFormatBDD.values()], 
        transaction
    )

    const fichierHashDéjàEnBDD = new Set( fichiersDéjaEnBDD.map(makeEspèceImpactéeHash) )

    //console.log('fichierHashDéjàEnBDD', fichierHashDéjàEnBDD)


    // Filtrer la liste des candidats en enlevant les fichiers déjà présents en base de données
    const fichiersÀTélécharger = new Map([...candidatsFichiersImpactéesFormatBDD]
        .filter(([_, fichier]) => {
            const hash = makeEspèceImpactéeHash(fichier)
            return !fichierHashDéjàEnBDD.has(hash)
        })
    )

    //console.log('fichiersÀTélécharger', fichiersÀTélécharger.size)

    /** @typedef { [DossierDS88444['number'], Partial<Fichier>] } ReturnMapEntryData */

    // Télécharger les fichiers et les mettre dans un format prêt à être insérés en BDD (mais qui n'a pas de Dossier.id)
    /** @type {Promise<ReturnMapEntryData | undefined>[]} */
    const retMapDataPs = [...fichiersÀTélécharger].map(async ([number, fichier]) => {
        const {url} = fichier
        try {        
            // @ts-ignore
            const { contenu } = await téléchargerFichierDS(url);
            const { DS_checksum, DS_createdAt, media_type, nom } = fichier;

            /** @type {ReturnMapEntryData} */
            const ret = [number, {
                DS_checksum,
                DS_createdAt,
                media_type,
                nom,
                contenu: Buffer.from(contenu) // knex n'accepte que les Buffer node, pas les ArrayBuffer
            }]

            return ret;
        } catch (err) {
            console.error(`Erreur lors du téléchargement d'un fichier`, err);
            return undefined;
        }
    })

    /** @type {ReturnMapEntryData[]} */
    const ret = (await Promise.allSettled(retMapDataPs))
        .filter(({status}) => status === 'fulfilled')
        //@ts-ignore
        .map((promiseFulfilledResult) => promiseFulfilledResult.value)
        .filter(x => x !== undefined)
    
    return new Map(ret)
}