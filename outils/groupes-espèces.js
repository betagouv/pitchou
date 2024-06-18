//@ts-check

import {readFile} from 'node:fs/promises'

import {sheetRawContentToObjects, getODSTableRawContent} from 'ods-xlsx'

/**
 * Cet outil prend le fichier data/ListeGroupesEspeces.ods et en fait un fichier json plus léger
 * qui contient les groupes d'espèces pour usage dans
 */

const groupeEspècesODSArrayBuffer = (await readFile('data/ListeGroupesEspeces.ods')).buffer

const tableRaw = await getODSTableRawContent(groupeEspècesODSArrayBuffer)
const sheetRaw = tableRaw.get('ListeGroupesEspeces')

// Trouver la première ligne avec plus de 5 éléments (qui est la "vraie" première ligne, avec les noms de colonne)
const firstRowIndex = sheetRaw.findIndex(row => row.length >= 5)
const actualSheetRaw = sheetRaw.slice(firstRowIndex)

const groupeEspècesSheet = sheetRawContentToObjects(actualSheetRaw)

console.log('groupeEspècesSheet', groupeEspècesSheet)

throw `PPP
    - trouver les espèces en se basant sur leur nom scientifique
        - warning sur ceux qu'on trouve pas
    - créer le json
`