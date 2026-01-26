import * as path from 'node:path'
import * as fs from 'node:fs/promises'

import * as csv from 'csv-parse/sync'
import parseArgs from 'minimist'
import memoize from 'just-memoize'

import { directDatabaseConnection, closeDatabaseConnection } from '../scripts/server/database.js';
import { construireActivitésMéthodesMoyensDePoursuite, espèceProtégéeStringToEspèceProtégée, importDescriptionMenacesEspècesFromOdsArrayBuffer } from '../scripts/commun/outils-espèces.js';

/** @import {default as Dossier} from '../scripts/types/database/public/Dossier.ts' */
/** @import { GeoMceMessage, DossierPourGeoMCE } from '../scripts/types/geomce.ts' */
//@ts-ignore
/** @import { PitchouState } from '../scripts/front-end/store.js' */
//@ts-ignore
/** @import { EspèceProtégée, DescriptionMenacesEspèces } from '../scripts/types/especes.ts' */

const DATA_DIR = path.join(import.meta.dirname, '../data')

/**
 * @returns {Promise<NonNullable<PitchouState['ActivitésMéthodesMoyensDePoursuite']>> }
 */
const chargerActivitésMéthodesMoyensDePoursuite = memoize(async function chargerActivitésMéthodesMoyensDePoursuite() {
    const activitésBuffer = await fs.readFile(path.join(DATA_DIR, 'activites-methodes-moyens-de-poursuite.ods'))
    return await construireActivitésMéthodesMoyensDePoursuite(activitésBuffer)
})

/**
 *
 * @returns {Promise<Map<EspèceProtégée['CD_REF'], EspèceProtégée>>}
 */
const chargerListeEspèceParCD_REF = memoize(async function chargerListeEspèceParCD_REF() {
    const espèceBuffer = await fs.readFile(path.join(DATA_DIR, 'liste-espèces-protégées.csv'))
    const listeEspèces = csv.parse(espèceBuffer, { columns: true, delimiter: ';', skip_empty_lines: true })

    // @ts-expect-error
    return new Map(listeEspèces.map((espèce) => {
        return [
            espèce['CD_REF'],
            espèceProtégéeStringToEspèceProtégée(espèce)
        ]
    }))
})


/**
 *
 * @param {Date | null} date
 * @returns {string | null}
 */
function formatDate(date) {
    return date ? date.toISOString().slice(0, 'YYYY-MM-DD'.length) : null
}

/**
 * @param {Dossier['id']} idDossier
 * @returns {Promise<DossierPourGeoMCE | undefined>}
 */
async function récupérerDossierParId(idDossier) {
    const dossierP = directDatabaseConnection('dossier')
        .select(['dossier.*', 'fichier.contenu as fichier_contenu', 'fichier.media_type as fichier_media_type', 'décision_administrative.date_signature'])
        .leftJoin('décision_administrative', {'décision_administrative.dossier': 'dossier.id'})
        .leftJoin('fichier', {'fichier.id': 'dossier.espèces_impactées'})
        .where({ 'dossier.id': idDossier, 'décision_administrative.type': 'Arrêté dérogation' })
        .orderBy('décision_administrative.date_signature', 'asc')
        .first()

    const instructeursP = directDatabaseConnection('arête_personne_suit_dossier')
        .select('personne.*')
        .join('personne', {'personne.id': 'arête_personne_suit_dossier.personne'})
        .where({'arête_personne_suit_dossier.dossier': idDossier})

    const [dossier, instructeurs] = await Promise.all([dossierP, instructeursP])

    const espèceParCD_REF = await chargerListeEspèceParCD_REF()
    const { activités, méthodes, moyensDePoursuite } = await chargerActivitésMéthodesMoyensDePoursuite()
    /** @type {DescriptionMenacesEspèces} */
    let descriptionEspèces = {
        oiseau: [],
        "faune non-oiseau": [],
        flore: []
    }
    
    if(dossier.fichier_media_type === 'application/vnd.oasis.opendocument.spreadsheet'){
        try{
            descriptionEspèces = await importDescriptionMenacesEspècesFromOdsArrayBuffer(
                dossier.fichier_contenu,
                espèceParCD_REF,
                activités,
                méthodes,
                moyensDePoursuite
            )
        }
        catch(e){
            if(e.cause === 'format incorrect'){
                // ignorer
            }
            else{
                console.error('Erreur lors de la génération du message GeoMCE. Dossier', idDossier)
                console.error('Dossier', dossier)
                console.error(e)
                process.exit()
            }
        }
    }

    

    return {
        instructeurs: instructeurs.map(({ email }) => {
            return {
                email,
                date_from: formatDate(dossier.date_dépôt)
            }
        }),
        specimens_faunes: [
            ...new Set((descriptionEspèces.oiseau || []).map(({ espèce }) => espèce)),
            ...new Set((descriptionEspèces['faune non-oiseau'] || []).map(({ espèce }) => espèce)),
        ].map((espèce) => {
            return {
                nom_scientifique: espèce.nomsScientifiques.values().next().value
            }
        }),
        specimens_flores: [...new Set(
            (descriptionEspèces.flore || []).map(({ espèce }) => espèce)
        )].map((espèce) => {
            return {
                nom_scientifique: espèce.nomsScientifiques.values().next().value
            }
        }),
        ...dossier
    }
}

let nbFinis = 0

/**
 * @param {Dossier['id']} idDossier
 * @returns {Promise<GeoMceMessage>}
 */
async function genererMessageGeoMCE(idDossier) {
    const dossier = await récupérerDossierParId(idDossier)

    if (dossier === undefined) {
        throw new Error(`Le dossier avec l'id ${idDossier} n'a pas pu être trouvé.`)
    }

    console.log('nbFinis', ++nbFinis)
    return {
        projet: {
            ref: `PITCHOU-${dossier.id}`,
            nom: dossier.nom || `Dossier Pitchou #${dossier.id}`,
            description: dossier.description || '',
            // @ts-expect-error
            localisations: dossier.communes?.map(({ code }) => code),
            avancement: "Autorisé",
            typologies: null,
            maitrise_ouvrage: dossier.demandeur_personne_morale !== null ? [{
                siret: dossier.demandeur_personne_morale
            }] : null,
            emprises: null
        },
        procedure: {
            num_dossier: `PITCHOU-${dossier.id}`,
            type: "En Attente de GeoMCE Dérogation Espèces Protégées",
            description: dossier.description || '',
            references: [ `PITCHOU-${dossier.id}` ],
            date_decision: formatDate(dossier.date_signature),
            instructeurs: dossier.instructeurs,
            autorite_decisionnaire: null,
            specimens_faunes: dossier.specimens_faunes,
            specimens_flores: dossier.specimens_flores,
            emprises: null
        },
        mesures: []
    }
}

/**
 * 
 * @returns {Promise<Dossier['id'][]>}
 */
async function listerDossiersPourDéclarationGeoMCE(){
    const dossiers = await directDatabaseConnection('dossier')
        .select('dossier.id')
        .from('dossier')
        .join('décision_administrative', {'décision_administrative.dossier': 'dossier.id'})
        .where({'décision_administrative.type': 'Arrêté dérogation'})
        .whereNotNull('décision_administrative.date_signature')
        .whereNotNull('dossier.espèces_impactées');
    
    return dossiers.map(({ id }) => id)
}

async function main() {
    console.time('yo')
    const args = parseArgs(process.argv);

    if (args['lister-dossiers']) {
        const dossiers = await listerDossiersPourDéclarationGeoMCE()
        console.log(`${dossiers.length} dossiers trouvés:\n`)
        console.log(dossiers.join(', '))

    } else if (args.dossier) {
        // @ts-expect-error
        console.log(JSON.stringify(await genererMessageGeoMCE(parseInt(args.dossier)), null, 4))
    } else if(args['tous-les-dossiers']){
        const dossiers = await listerDossiersPourDéclarationGeoMCE()
        console.log(`${dossiers.length} dossiers trouvés:\n`)
        const messagesGeoMCE = await Promise.all(dossiers.map(genererMessageGeoMCE))
        console.timeEnd('yo')

        console.log('messagesGeoMCE', messagesGeoMCE.length)
        console.log('taille', JSON.stringify(messagesGeoMCE).length)
        

    } else{
        console.log(`Usage:
--lister-dossiers\tLister les ID des dossiers candidats
--dossier ID_DOSSIER\tAffichier le message GeoMCE pour le dossier
--tous-les-dossiers\tCréer le résultat pour GeoMCE pour l'ensemble des dossiers`)
    }

    await closeDatabaseConnection()
}

await main()
