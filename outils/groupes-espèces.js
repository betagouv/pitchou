//@ts-check

import {readFile, writeFile} from 'node:fs/promises'
import {sheetRawContentToObjects, getODSTableRawContent} from 'ods-xlsx'
import { dsvFormat } from 'd3-dsv';

import {espèceProtégéeStringToEspèceProtégée} from '../scripts/commun/outils-espèces.js'

import '../scripts/types.js'

/** @import {
 *   EspèceProtégée,
 *   EspèceProtégéeStrings,
 * } from '../scripts/types/especes.d.ts' */

/**
 * Cet outil prend le fichier data/ListeGroupesEspeces.ods et en fait un fichier json plus léger
 * qui contient les groupes d'espèces pour usage dans
 */

const lignesGroupeEspècesP = readFile('data/ListeGroupesEspeces.ods')
    .then(({buffer: groupeEspècesODSArrayBuffer}) => getODSTableRawContent(groupeEspècesODSArrayBuffer))
    .then(tableRaw => {
        const sheetRaw = tableRaw.get('ListeGroupesEspeces')

        // Trouver la première ligne avec plus de 5 éléments (qui est la "vraie" première ligne, avec les noms de colonne)
        const firstRowIndex = sheetRaw.findIndex(row => row.length >= 5)
        const actualSheetRaw = sheetRaw.slice(firstRowIndex)

        return sheetRawContentToObjects(actualSheetRaw)
    })

/** @type {Promise<Map<string, EspèceProtégée>>} */    
const espèceParNomScientifiqueP = readFile('data/liste-espèces-protégées.csv', 'utf8')
    .then(str => {
        /** @type {EspèceProtégéeStrings[]} */
        const espèceStrs = dsvFormat(';').parse(str)

        const espèces = espèceStrs.map(espèceProtégéeStringToEspèceProtégée)

        /** @type {Map<string, EspèceProtégée>} */
        const ret = new Map()

        for(const espèce of espèces){
            for(const nom of espèce.nomsScientifiques){
                ret.set(nom, espèce)
            }
        }

        return ret
    })
    
const outputPath = 'data/groupes_especes.json'

Promise.all([lignesGroupeEspècesP, espèceParNomScientifiqueP])
.then(([lignesGroupeEspèces, espèceParNomScientifique]) => {
    /** @type {GroupesEspèces} */
    const groupesEspèces = Object.create(null)

    const espècesNonReconnues = []

    for(const ligne of lignesGroupeEspèces){
        const {'Nom scientifique': nomScientifique, 'Nom du groupe': nomGroupe} = ligne

        let espèceDuGroupe = espèceParNomScientifique.get(nomScientifique)

        /** @type {EspèceSimplifiée | string} */
        let jsonableEspèce;
        
        if(espèceDuGroupe){
            const {nomsScientifiques, CD_REF} = espèceDuGroupe
            jsonableEspèce = {nom: [...nomsScientifiques][0], CD_REF}
        }
        else{
            espècesNonReconnues.push(ligne)
            jsonableEspèce = nomScientifique
        }

        const groupe = groupesEspèces[nomGroupe] || []
        groupe.push(jsonableEspèce)
        groupesEspèces[nomGroupe] = groupe
    }

    if(espècesNonReconnues.length >= 1){
        const set = new Set(espècesNonReconnues.map(e => e['Nom scientifique']))
        console.log([...set].join('\n'))
        console.log(
            set.size, 
            'espèces non reconnues sur', 
            (new Set(lignesGroupeEspèces.map(e => e['Nom scientifique'])).size)
        )
    }

    const jsonOutput = JSON.stringify(groupesEspèces);

    return writeFile(outputPath, jsonOutput, 'utf8');
})
.then(() => console.log(`Fichier ${outputPath} créé avec succès`))
