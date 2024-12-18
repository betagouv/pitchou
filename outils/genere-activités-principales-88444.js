//@ts-check

import {writeFile, readFile} from 'node:fs/promises'

import parseArgs from 'minimist'
import ky from 'ky'

/** @import {SchemaDémarcheSimplifiée} from '../scripts/types/démarches-simplifiées/schema.ts' */

const args = parseArgs(process.argv)

/** @type {SchemaDémarcheSimplifiée} */
let schema88444;

const schemaPath = 'data/démarches-simplifiées/schema-DS-88444.json'
const outputPath = 'data/démarches-simplifiées/activités-principales-DS-88444.json'

if(args.skipDownload){
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
} else {
    const urlSchema88444 = 'https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema'
    let schemaStr;

    console.log(`Téléchargement de la dernière version du schema DS 88444`)

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
    }
    catch(e){
        // ignore
    }
}

const { revision: { champDescriptors } } = schema88444

for (const {label, options} of champDescriptors) {
    if (label === "Activité principale") {
        writeFile(outputPath, JSON.stringify(options), 'utf8');
        
        console.log(`Fichier ${outputPath} généré avec succès`)
    }
}
