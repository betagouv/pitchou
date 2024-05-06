//@ts-check

import {readFileSync, writeFileSync} from 'node:fs'
import {csvParse, tsvParse, dsvFormat} from 'd3-dsv'


// BDC_STATUTS

let bdc_statuts_raw = csvParse(readFileSync('data/sources_especes/BDC_STATUTS_17.csv', 'utf-8'))

console.log('bdc_statuts_raw.length', bdc_statuts_raw.length)

const keptCdTypeStatus = new Set(['POM', 'PD', 'PN', 'PR'])

const bdc_statuts = bdc_statuts_raw
.filter(({CD_TYPE_STATUT}) => keptCdTypeStatus.has(CD_TYPE_STATUT))
.map(
    ({CD_NOM, CD_TYPE_STATUT, LABEL_STATUT}) => ({CD_NOM, CD_TYPE_STATUT, LABEL_STATUT})
)

// @ts-ignore
bdc_statuts_raw = undefined // for GC

console.log('bdc_statuts.length', bdc_statuts.length)

console.log('bdc_statuts unique CD_NOM', new Set(bdc_statuts.map(({CD_NOM}) => CD_NOM)).size)

// Espèces Manquantes
let espèce_manquantes_raw = dsvFormat(';').parse(readFileSync('data/sources_especes/espèces_manquantes.csv', 'utf-8'))

console.log('espèce_manquantes_raw.length', espèce_manquantes_raw.length)

const espèces_manquantes = espèce_manquantes_raw.map(({ CD_NOM, LABEL_STATUT }) => ({ CD_NOM, CD_TYPE_STATUT: "Protection Pitchou", LABEL_STATUT }))
// @ts-ignore
const espèces_protégées = [].concat(bdc_statuts, espèces_manquantes)

// TAXREF

let taxref_raw = tsvParse(readFileSync('data/sources_especes/TAXREFv17.txt', 'utf-8'))

console.log('taxref_raw.length', taxref_raw.length)

const taxref = taxref_raw
.filter(({CD_NOM, CD_REF}) => CD_NOM === CD_REF)
.map(({LB_NOM, NOM_COMPLET_HTML, CD_NOM, NOM_VERN, REGNE, CLASSE}) => 
    ({LB_NOM, NOM_COMPLET_HTML, CD_NOM, NOM_VERN, REGNE, CLASSE}))

// @ts-ignore
taxref_raw = undefined // for GC

const taxrefByCD_NOM = new Map()

for(const taxon of taxref){
    const {CD_NOM} = taxon
    taxrefByCD_NOM.set(CD_NOM, taxon)
}

const output = espèces_protégées.map(espèce_protégée => {
    const {CD_NOM} = espèce_protégée

    const taxon = taxrefByCD_NOM.get(CD_NOM)

    return Object.assign(
        {},
        espèce_protégée,
        taxon
    )
})

const règnes = new Set(output.map(({REGNE}) => REGNE))
console.log('Liste des règnes parmi les espèces protégées :', [...règnes].join(', '))

const classes = new Set(output.map(({CLASSE}) => CLASSE))
console.log('Liste des classes (tout règne confondu) parmi les espèces protégées :', [...classes].join(', '))


writeFileSync('data/liste_especes.csv', dsvFormat(';').format(output))