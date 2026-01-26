import {join} from 'node:path'
import {readFile} from 'node:fs/promises'

import {dsvFormat} from 'd3-dsv'
import memoize from 'just-memoize'

import { byteFormat } from "../../commun/typeFormat.js";
import { directDatabaseConnection } from '../../server/database.js';
import { construireActivitésMéthodesMoyensDePoursuite, espèceProtégéeStringToEspèceProtégée, importDescriptionMenacesEspècesFromOdsArrayBuffer } from '../../commun/outils-espèces.js';

/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../../types/database/public/Personne.ts' */
/** @import { GeoMceMessage, DossierPourGeoMCE } from '../../types/geomce.ts' */
//@ts-ignore
/** @import { PitchouState } from '../scripts/front-end/store.js' */
//@ts-ignore
/** @import { EspèceProtégée, DescriptionMenacesEspèces } from '../scripts/types/especes.ts' */

const DATA_DIR = join(import.meta.dirname, '../../../data')

/**
 * @returns {Promise<NonNullable<PitchouState['ActivitésMéthodesMoyensDePoursuite']>> }
 */
const chargerActivitésMéthodesMoyensDePoursuite = memoize(async function chargerActivitésMéthodesMoyensDePoursuite() {
    const activitésBuffer = await readFile(join(DATA_DIR, 'activites-methodes-moyens-de-poursuite.ods'))
    return await construireActivitésMéthodesMoyensDePoursuite(activitésBuffer)
})

/**
 * Le premier appel memoize une version parsée de liste-espèces-protégées.csv, donc plusieurs Mo
 * 
 * @returns {Promise<Map<EspèceProtégée['CD_REF'], EspèceProtégée>>}
 */
const chargerListeEspèceParCD_REF = memoize(async function chargerListeEspèceParCD_REF() {
    const espèceBuffer = await readFile(join(DATA_DIR, 'liste-espèces-protégées.csv'))
    const listeEspèces = dsvFormat(';').parse(espèceBuffer.toString())

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
 * @param {Dossier['id'][] | Dossier['id']} idDossiers
 * @returns {Promise<DossierPourGeoMCE[] | undefined>}
 */
async function récupérerDossiersParIds(idDossiers) {
    if(!Array.isArray(idDossiers)){
        idDossiers = [idDossiers]
    }

    const dossiersP = directDatabaseConnection('dossier')
        .select(['dossier.*', 'fichier.contenu as fichier_contenu', 'fichier.media_type as fichier_media_type', 'décision_administrative.date_signature'])
        .leftJoin('décision_administrative', {'décision_administrative.dossier': 'dossier.id'})
        .leftJoin('fichier', {'fichier.id': 'dossier.espèces_impactées'})
        .where({ 'décision_administrative.type': 'Arrêté dérogation' })
        .whereIn('dossier.id', idDossiers)
        .orderBy('décision_administrative.date_signature', 'asc')
        .then(dossiers => {
            // Cette requête retourne plusieurs lignes par dossier s'il y a plusieurs décision_administrative
            // La fonction actuelle filtre pour n'avoir qu'une seule ligne
            const idDéjàVus = new Set()

            return dossiers.filter(d => {
                const id = d.id
                if(idDéjàVus.has(id)){
                    return false
                }
                else{
                    idDéjàVus.add(id)
                    return true
                }
            })
        })

    const instructeursDossierP = directDatabaseConnection('arête_personne_suit_dossier')
        .select(['personne.email as email', 'arête_personne_suit_dossier.dossier as dossier'])
        .join('personne', {'personne.id': 'arête_personne_suit_dossier.personne'})
        .whereIn('arête_personne_suit_dossier.dossier', idDossiers)

    /** @type {Promise<Map<Dossier['id'], Personne['email'][]>>} */
    const instructeursByDossierIdP = instructeursDossierP.then(instructeursDossiers => {
        /** @type {Awaited<typeof instructeursByDossierIdP>} */
        const instructeursByDossier = new Map()

        for(const {email, dossier} of instructeursDossiers){
            const instructeurs = instructeursByDossier.get(dossier) || []
            instructeurs.push(email)
            instructeursByDossier.set(dossier, instructeurs)
        }

        return instructeursByDossier
    })


    const [
        espèceParCD_REF, 
        { activités, méthodes, moyensDePoursuite },
        instructeursByDossierId,
        dossiers
    ] = await Promise.all(
        [
            chargerListeEspèceParCD_REF(), 
            chargerActivitésMéthodesMoyensDePoursuite(),
            instructeursByDossierIdP,
            dossiersP
        ]
    )


    return await Promise.all(dossiers.map(async dossier => {
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
                // @ts-ignore
                if(e.cause === 'format incorrect'){
                    // ignorer
                }
                else{
                    console.error('Erreur lors de la génération du message GeoMCE. Dossier', idDossiers)
                    console.error('Dossier', dossier)
                    console.error(e)
                    process.exit()
                }
            }
        }

        const instructeurs = instructeursByDossierId.get(dossier.id) || []

        return {
            instructeurs: instructeurs.map(email => {
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
    }))
    
}

/**
 * @param {DossierPourGeoMCE} dossierPourGeoMCE
 * @returns {Promise<GeoMceMessage>}
 */
async function genererMessagesGeoMCE(dossierPourGeoMCE) {

    return {
        projet: {
            ref: `PITCHOU-${dossierPourGeoMCE.id}`,
            nom: dossierPourGeoMCE.nom || `Dossier Pitchou #${dossierPourGeoMCE.id}`,
            description: dossierPourGeoMCE.description || '',
            // @ts-expect-error
            localisations: dossierPourGeoMCE.communes?.map(({ code }) => code),
            avancement: "Autorisé",
            typologies: null,
            maitrise_ouvrage: dossierPourGeoMCE.demandeur_personne_morale !== null ? [{
                siret: dossierPourGeoMCE.demandeur_personne_morale
            }] : null,
            emprises: null
        },
        procedure: {
            num_dossier: `PITCHOU-${dossierPourGeoMCE.id}`,
            type: "En Attente de GeoMCE Dérogation Espèces Protégées",
            description: dossierPourGeoMCE.description || '',
            references: [ `PITCHOU-${dossierPourGeoMCE.id}` ],
            date_decision: formatDate(dossierPourGeoMCE.date_signature),
            instructeurs: dossierPourGeoMCE.instructeurs,
            autorite_decisionnaire: null,
            specimens_faunes: dossierPourGeoMCE.specimens_faunes,
            specimens_flores: dossierPourGeoMCE.specimens_flores,
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
    
    // @ts-ignore
    return dossiers.map(({ id }) => id)
}



export async function générerDéclarationGeoMCE(){
    const dossiers = await listerDossiersPourDéclarationGeoMCE()
    console.log(`${dossiers.length} dossiers trouvés\n`)
    const dossiersPourGeoMCE = (await récupérerDossiersParIds(dossiers) || [])
        .filter(d => d !== undefined)

    const messagesGeoMCE = await Promise.all(dossiersPourGeoMCE.map(genererMessagesGeoMCE))

    console.log('messagesGeoMCE', messagesGeoMCE.length)
    console.log('taille en JSON', byteFormat.format(JSON.stringify(messagesGeoMCE).length))
    return messagesGeoMCE
}