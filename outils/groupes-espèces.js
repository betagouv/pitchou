//@ts-check

import {readFile, writeFile} from 'node:fs/promises'
import {sheetRawContentToObjects, getODSTableRawContent} from 'ods-xlsx'
import { dsvFormat } from 'd3-dsv';

import '../scripts/types.js'

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

const espèceParNomScientifiqueP = readFile('data/liste-espèces-protégées.csv', 'utf8')
    .then(str => {
        /** @type {EspèceProtégées[]} */
        const espèces = dsvFormat(';').parse(str)

        return new Map(espèces.map(e => {
            return [e['LB_NOM'], e]
        }))
    })
    
const outputPath = 'data/groupes_especes.json'

Promise.all([lignesGroupeEspècesP, espèceParNomScientifiqueP])
.then(([lignesGroupeEspèces, espèceParNomScientifique]) => {
    /** @type {GroupesEspèces} */
    const groupesEspèces = Object.create(null)

    const espècesNonReconnues = []

    for(const ligne of lignesGroupeEspèces){
        const {'Nom scientifique': nomScientifique, 'Nom du groupe': nomGroupe} = ligne
        const espèceDuGroupe = espèceParNomScientifique.get(nomScientifique)
        
        /** @type {EspèceSimplifiée | string} */
        let jsonableEspèce;
        
        if(espèceDuGroupe){
            const {LB_NOM, CD_NOM} = espèceDuGroupe
            jsonableEspèce = {LB_NOM, CD_NOM}
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
        console.log(set.size, 'espèces non reconnues', espècesNonReconnues.length, lignesGroupeEspèces.length)
    }

    const jsonOutput = JSON.stringify(groupesEspèces);

    return writeFile(outputPath, jsonOutput, 'utf8');
})
.then(() => console.log(`Fichier ${outputPath} créé avec succès`))
