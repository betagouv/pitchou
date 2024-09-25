//@ts-check

import {readFile} from 'node:fs/promises'
import {createReadStream, createWriteStream} from 'node:fs'
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import {dsvFormat} from 'd3-dsv'

import {TAXREF_ROWClassification, nomsVernaculaires} from '../scripts/commun/outils-espèces.js'

import '../scripts/types.js'
/** @import {TAXREF_ROW, EspèceProtégée} from "../scripts/types/especes.js" */

process.title = `Génération liste espèces`

/**
 * 
 * BDC_STATUTS
 * 
 */
const keptCdTypeStatus = new Set(['POM', 'PD', 'PN', 'PR'])

const bdcParser = parse({
  delimiter: ',',
  columns: true,
  trim: true
});

/** @type {Promise<BDC_STATUT_ROW[]>} */
const bdc_statutsP = new Promise((resolve, reject) => {

    /** @type {BDC_STATUT_ROW[]} */
    const espècesProtégéesBDC_STATUTS = []
    // Use the readable stream api to consume records
    bdcParser.on('readable', function(){
        /** @type {BDC_STATUT_ROW} */
        let record;
        while ((record = bdcParser.read()) !== null) {
            // > Le CD_NOM du taxon retenu dans la base de connaissance est celui du nom cité dans 
            // le document source faisant référence au statut. Le CD_REF est l’identifiant attaché 
            // au nom valide correspondant àce CD_NOM dans la dernière version diffusée de TAXREF.
            // https://inpn.mnhn.fr/docs-web/docs/download/232196 (page 6)
            const {CD_NOM, CD_REF, CD_TYPE_STATUT, LABEL_STATUT} = record
            if(keptCdTypeStatus.has(CD_TYPE_STATUT)){
                espècesProtégéesBDC_STATUTS.push({CD_NOM, CD_REF, CD_TYPE_STATUT, LABEL_STATUT});
            }
        }
    });
    
    bdcParser.on('error', reject);
    bdcParser.on('end', () => resolve(espècesProtégéesBDC_STATUTS));
})


createReadStream('data/sources_especes/BDC_STATUTS_17.csv').pipe(bdcParser)

bdc_statutsP.then(bdc_statuts => {
    console.log('bdc_statuts.length', bdc_statuts.length)
    console.log('bdc_statuts unique CD_NOM', new Set(bdc_statuts.map(({CD_NOM}) => CD_NOM)).size)
})


// Espèces Manquantes
/** @type {Promise<BDC_STATUT_ROW[]>} */
const espèces_manquantesP = readFile('data/sources_especes/espèces_manquantes.csv', 'utf-8')
    .then(espèces_manquantes_rawStr => {
        /** @type {BDC_STATUT_ROW[]} */
        // @ts-ignore
        const espèces_manquantes_raw = dsvFormat(';').parse(espèces_manquantes_rawStr)
        console.log('espèces_manquantes_raw.length', espèces_manquantes_raw.length)
        return espèces_manquantes_raw
            .map(({ CD_NOM, LABEL_STATUT }) => ({ CD_NOM, CD_REF: CD_NOM, CD_TYPE_STATUT: "Protection Pitchou", LABEL_STATUT }))
    }) 

/** @type {Promise<BDC_STATUT_ROW[]>} */
const protectionsEspècesP = Promise.all([bdc_statutsP, espèces_manquantesP])
    // @ts-ignore
    .then(([bdc_statuts, espèce_manquantes]) => [...espèce_manquantes, ...bdc_statuts])


/**
 * 
 * TAXREF
 * 
 */
const taxrefParser = parse({
    delimiter: '\t',
    columns: true,
    trim: true
});


/** @type {Promise<TAXREF_ROW[]>} */
const taxrefP = new Promise((resolve, reject) => {

    /** @type {TAXREF_ROW[]} */
    const taxref = []
    // Use the readable stream api to consume records
    taxrefParser.on('readable', function(){
        /** @type {TAXREF_ROW} */
        let record;
        while ((record = taxrefParser.read()) !== null) {
            const {LB_NOM, CD_NOM, NOM_VERN, CD_REF, REGNE, CLASSE} = record
            taxref.push({LB_NOM, CD_NOM, CD_REF, NOM_VERN, REGNE, CLASSE});
        }
    });

    taxrefParser.on('error', reject);
    taxrefParser.on('end', () => resolve(taxref));
})

createReadStream('data/sources_especes/TAXREFv17.txt').pipe(taxrefParser)

taxrefP.then(taxref => {
    console.log('taxref.length', taxref.length)
})


/**
 * 
 * Génération du fichier liste espèces
 * 
 */

Promise.all([taxrefP, protectionsEspècesP])
.then(([taxref, protectionsEspèces]) => {
    /** @type {Map<EspèceProtégée['CD_REF'], Partial<EspèceProtégée>>} */
    const espècesProtégées = new Map()

    for(const {CD_REF, CD_TYPE_STATUT} of protectionsEspèces){
        let espèceProtégée = espècesProtégées.get(CD_REF)

        if(!espèceProtégée){
            espèceProtégée = {
                CD_REF,
                CD_TYPE_STATUTS: new Set(),
                nomsScientifiques: new Set(),
                nomsVernaculaires: new Set(),
            }
            espècesProtégées.set(CD_REF, espèceProtégée)
        }

        // @ts-ignore
        espèceProtégée.CD_TYPE_STATUTS.add(CD_TYPE_STATUT)
    }

    // Rajouter les noms de Taxref 
    for(const row of taxref){
        const {CD_NOM, CD_REF, NOM_VERN, LB_NOM} = row
        // uniquement pour les espèces protégées
        const espèceProtégée = espècesProtégées.get(CD_REF)

        if(espèceProtégée){
            if(!espèceProtégée.classification){
                espèceProtégée.classification = TAXREF_ROWClassification(row)
            }

            if(CD_REF === CD_NOM){
                // mettre le nom de l'espèce de référence en premier
                // @ts-ignore
                espèceProtégée.nomsScientifiques = new Set([LB_NOM, ...espèceProtégée.nomsScientifiques])
                espèceProtégée.nomsVernaculaires = new Set([...nomsVernaculaires(NOM_VERN), ...espèceProtégée.nomsVernaculaires])
            }
            else{
                // @ts-ignore
                espèceProtégée.nomsScientifiques.add(LB_NOM)
                espèceProtégée.nomsVernaculaires = new Set([...espèceProtégée.nomsVernaculaires, ...nomsVernaculaires(NOM_VERN)])
            }
        }
    }

    // nettoyage, car parfois certaines espèces protégées n'ont pas été trouvées dans TAXREF
    for(const [CD_REF, espèce] of espècesProtégées){
        if(!espèce.classification){
            console.warn(`Espèce sans classification CD_REF ${CD_REF}`)
            espècesProtégées.delete(CD_REF)
        }
        else{
            //@ts-ignore
            if(espèce.nomsScientifiques.size === 0 && espèce.nomsVernaculaires.size === 0){
                console.warn(`Espèce sans noms CD_REF ${CD_REF}`)
                espècesProtégées.delete(CD_REF)
            }
        }
    }



    const stringifier = stringify({
        delimiter: ';',
        header: true
    });

    stringifier.pipe(createWriteStream('data/liste-espèces-protégées.csv'))

    for(const {CD_REF, classification, nomsScientifiques, nomsVernaculaires, CD_TYPE_STATUTS} of [...espècesProtégées.values()]){
        stringifier.write({
            CD_REF, 
            classification, 
            nomsScientifiques: [...(nomsScientifiques || [])].join(','),
            nomsVernaculaires: [...(nomsVernaculaires || [])].join(','), 
            CD_TYPE_STATUTS: [...(CD_TYPE_STATUTS || [])].join(',')
        })
    }
    stringifier.end()

})





/*

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

*/