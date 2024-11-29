import knexModule from 'knex'
import {readFile} from 'node:fs/promises'
import {dsvFormat} from 'd3-dsv'

import { importDescriptionMenacesEspècesFromURL, descriptionMenacesEspècesToOdsArrayBuffer, espèceProtégéeStringToEspèceProtégée } from '../scripts/commun/outils-espèces.js';
import {actMetTransArraysToMapBundle} from '../scripts/front-end/actions/main.js'

/** @import {ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant} from '../scripts/types/especes.js' */
/** @import {PitchouState} from '../scripts/front-end/store.js' */

const {parse} = dsvFormat(';')

/** @type { [ActivitéMenançante[], MéthodeMenançante[], TransportMenançant[], any[]] } */
// @ts-ignore
const [activitésBrutes, méthodesBrutes, transportsBruts, dataEspèces] = await Promise.all([
    readFile('data/activités.csv', 'utf-8'),
    readFile('data/méthodes.csv', 'utf-8'),
    readFile('data/transports.csv', 'utf-8'),
    readFile('data/liste-espèces-protégées.csv', 'utf-8')
]).then(fichiers => fichiers.map(str => parse(str)))

const {activités, méthodes, transports} = actMetTransArraysToMapBundle(activitésBrutes, méthodesBrutes, transportsBruts)

/** @type {NonNullable<PitchouState['espèceByCD_REF']>} */
const espèceByCD_REF = new Map()

for(const espStr of dataEspèces){
    /** @type {EspèceProtégée} */
    // @ts-ignore
    const espèce = Object.freeze(espèceProtégéeStringToEspèceProtégée(espStr))

    espèceByCD_REF.set(espèce['CD_REF'], espèce)
}


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    const databaseConnection = knexModule({
        client: 'pg',
        connection: process.env.DATABASE_URL,
    });

    const idEtLien = await databaseConnection('dossier')
        .select(['id', 'espèces_protégées_concernées'])
        .whereNotNull('espèces_protégées_concernées')
        .andWhereNot('espèces_protégées_concernées', '')

    console.log('idEtLien', idEtLien.length)

    const espècesProtégéesConcernées = []

    for(const {id, espèces_protégées_concernées} of idEtLien){
        try{
            if(espèces_protégées_concernées){
                const url = new URL(espèces_protégées_concernées);
                const descriptionMenacesEspèces = importDescriptionMenacesEspècesFromURL(url, espèceByCD_REF, activités, méthodes, transports)
                if(descriptionMenacesEspèces){
                    const odsArrayBuffer = await descriptionMenacesEspècesToOdsArrayBuffer(descriptionMenacesEspèces)
                    espècesProtégéesConcernées.push({
                        dossier: id,
                        nom: 'espèces-protégées.ods',
                        "media_type": 'application/vnd.oasis.opendocument.spreadsheet',
                        contenu: Buffer.from(odsArrayBuffer) // knex n'accepte que les Buffer node, pas les ArrayBuffer
                    })
                }
            }
        }
        catch(e){
            // ignore
        }
    }

    console.log('espècesProtégéesConcernées', espècesProtégéesConcernées.length)

    await databaseConnection('espèces_protégées_concernées').insert(espècesProtégéesConcernées)

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    const databaseConnection = knexModule({
        client: 'pg',
        connection: process.env.DATABASE_URL,
    });
    
    await databaseConnection('espèces_protégées_concernées').delete()
};

