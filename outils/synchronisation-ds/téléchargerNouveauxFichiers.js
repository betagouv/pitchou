import {extname} from 'node:path';
import byteSize from 'byte-size'
import {HTTPError} from 'ky'

import { ajouterFichier, trouverFichiersExistants } from '../../scripts/server/database/fichier.js';
import { makeFichierHash } from '../../scripts/server/database/fichier.js';

import téléchargerFichierDS from './téléchargerFichierDS.js';


/** @import {DossierDS88444, DSFile} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {default as Fichier} from '../../scripts/types/database/public/Fichier.ts' */
/** @import {Knex} from 'knex' */

/** @typedef {Omit<Fichier, 'id' | 'contenu'> & {url: string}} FichierÀTélécharger */


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
 * @param {Pick<DSFile, 'contentType' | 'filename'>} contentType 
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
 * Cette fonction lance les téléchargements, sauvegade les fichiers en base de données
 * et retourne l'association entre le dossier et les Fichier['id'] correspondants
 * 
 * @param {Map<DossierDS88444['number'], DSFile[]>} candidatsFichiers 
 * @param {Knex.Transaction | Knex} [transaction]
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id'][]>>}
 */
export default async function téléchargerNouveauxFichiers(candidatsFichiers, transaction){
    /** @type {Map<DossierDS88444['number'], FichierÀTélécharger[]>} */
    const candidatsFichiersBDD = new Map(
        [...candidatsFichiers].map(([number, fichiers]) => {
            return [
                number,
                fichiers.map(({filename, contentType, checksum, createdAt, url}) => ({
                    nom: filename,
                    media_type: DScontentTypeToActualMediaType({filename, contentType}),
                    DS_checksum: checksum,
                    DS_createdAt: new Date(createdAt),
                    url
                }))
            ]
        })
    )

    // Chercher dans la base de données les fichiers que nous avons déjà et qui ressemblent aux candidats
    const fichiersDéjaEnBDD = await trouverFichiersExistants(
        [...candidatsFichiersBDD.values()].flat(), 
        transaction
    )

    const fichierHashDéjàEnBDD = new Set( fichiersDéjaEnBDD.map(makeFichierHash) )

    //console.log('fichierHashDéjàEnBDD', fichierHashDéjàEnBDD)


    // Filtrer la liste des candidats en enlevant les fichiers déjà présents en base de données
    /** @type {typeof candidatsFichiersBDD} */
    // @ts-ignore
    const fichiersÀTélécharger = new Map([...candidatsFichiersBDD]
        .map(([number, fichiers]) => {
            return [ number, fichiers.filter(f => !fichierHashDéjàEnBDD.has(makeFichierHash(f))) ]
        })
        // @ts-ignore
        .filter(([_, fichiers]) => fichiers.length >= 1)
    )

    //console.log('fichiersÀTélécharger', fichiersÀTélécharger.size)

    /** @typedef { [DossierDS88444['number'], Fichier['id'][]] } ReturnMapEntryData */

    // Télécharger les fichiers et les mettre directement en base de données
    /** @type {Promise<ReturnMapEntryData | undefined>[]} */
    
    // @ts-ignore
    const retMapDataPs = [...fichiersÀTélécharger].map(([number, fichiers]) => {
        return Promise.all(fichiers.map(async fichier => {
            const {url} = fichier
            /** @type {Omit<Fichier, 'id'>} */
            let fichierBDD;

            try {
                const { contenu } = await téléchargerFichierDS(url);
                const { DS_checksum, DS_createdAt, media_type, nom } = fichier;

                fichierBDD = {
                    DS_checksum,
                    DS_createdAt,
                    media_type,
                    nom,
                    contenu: Buffer.from(contenu) // knex n'accepte que les Buffer node, pas les ArrayBuffer
                } 

            } catch (err) {
                if(err instanceof HTTPError){
                    console.error(`Erreur HTTP ${err.response.status} lors du téléchagement de l'url`, url, `dossier DS`, number)
                }
                else{
                    console.error(`Erreur lors du téléchargement d'un fichier`, url, `dossier DS`, number, err);
                }

                return undefined;
            }

            console.log(
                `Dossier DS`, number,
                `- Téléchargement et stockage fichier '${fichierBDD.nom}'`, 
                // @ts-ignore
                `(${byteSize(fichierBDD.contenu?.byteLength)})`
            )

            return ajouterFichier(fichierBDD, transaction)
                .then(f => f.id)
        }))
        .then(fichiersTéléchargés => {
            const fichiersTéléchargésAvecSuccès = fichiersTéléchargés.filter(f => f !== undefined)

            if(fichiersTéléchargésAvecSuccès.length >= 1){
                return [number, fichiersTéléchargésAvecSuccès]
            }
            else{
                return undefined
            }
        })
    })

    /** @type {ReturnMapEntryData[]} */
    const ret = (await Promise.all(retMapDataPs)) // ignore download errors
        .filter(x => x !== undefined)

    return new Map(ret)
}