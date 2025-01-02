//@ts-check

import {writeFile} from 'node:fs/promises'

import parseArgs from 'minimist'

import {getOrDownloadSchema88444} from './recupère-schema-88444.js'

const args = parseArgs(process.argv)

const outputPath = 'data/démarches-simplifiées/activités-principales-DS-88444.json'
const schema88444 = await getOrDownloadSchema88444(args)
const { revision: { champDescriptors } } = schema88444

for (const {label, options} of champDescriptors) {
    if (label === "Activité principale") {
        writeFile(outputPath, JSON.stringify(options), 'utf8');
        
        console.log(`Fichier ${outputPath} généré avec succès`)
    }
}
