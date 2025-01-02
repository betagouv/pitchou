import {writeFile, readFile} from 'node:fs/promises'
import ky from 'ky'

/** @import {SchemaDémarcheSimplifiée} from '../scripts/types/démarches-simplifiées/schema.ts' */

/**
 * 
 * @param {object} options 
 * @param {boolean} options.skipDownload
 * @returns {Promise<SchemaDémarcheSimplifiée>}
 */
export async function getOrDownloadSchema88444(options) { 
    /** @type {SchemaDémarcheSimplifiée} */
    let schema88444;

    const schemaPath = 'data/démarches-simplifiées/schema-DS-88444.json'
    if(options.skipDownload){
        /** @type {string} */
        let schemaStr;
        try{
            schemaStr = await readFile(schemaPath, 'utf-8')
        }
        catch(e){
            console.error('Erreur lors de la récupération du fichier data/démarches-simplifiées/schema-DS-88444.json')
            console.error(e)
            process.exit(1)
        }

        schema88444 = JSON.parse(schemaStr);

        console.log(`Utilisation du fichier data/démarches-simplifiées/schema-DS-88444.json déjà présent dans le repo`)

        return schema88444
    } else {
        const urlSchema88444 = 'https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema'
        let schemaStr;

        console.log(`--> Lancement du téléchargement de la dernière version du schema DS 88444`)

        try{
            schemaStr = await ky.get(urlSchema88444).text()
            schema88444 = JSON.parse(schemaStr);
        }
        catch(err){
            console.error(`Erreur lors du téléchargement de ${urlSchema88444}. Réessayer plus tard ou avec l'option --skipDownload`)
            console.error(err)
            process.exit(1)
        }

        try{
            await writeFile(schemaPath, JSON.stringify(schema88444, null, 4))
            console.log(`Dernière version du schema DS 88444 téléchargée !`)
        }
        catch(e){
            // ignore
        }

        return schema88444
    }
}
