/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../../types/database/public/Personne.ts' */
/** @import { GeoMceMessage, DossierPourGeoMCE } from '../../types/geomce.ts' */
/** @import { PitchouState } from '../../front-end/store.js' */
/** @import { DescriptionMenacesEspèces } from "../../types/especes.ts" */
/** @import { default as EspèceImpactée, EspCeImpactEInitializer as EspèceImpactéeInitializer } from "../../types/database/public/EspèceImpactée.ts" */
/** @import { default as Fichier } from "../../types/database/public/Fichier.ts" */
import { dsvFormat } from "d3-dsv"
import { readFile } from "node:fs/promises"
import memoize from "just-memoize"
import { join } from "node:path"
import { construireActivitésMéthodesMoyensDePoursuite, espèceProtégéeStringToEspèceProtégée, importDescriptionMenacesEspècesFromOdsArrayBuffer } from "../../commun/outils-espèces.js"


const DATA_DIR = join(import.meta.dirname, '../../../data')

/**
 * Le premier appel memoize une version parsée de liste-espèces-protégées.csv, donc plusieurs Mo
 * 
 * @returns {Promise<Map<EspèceProtégée['CD_REF'], EspèceProtégée>>}
 */
export const chargerListeEspèceParCD_REF = memoize(async function chargerListeEspèceParCD_REF() {
    const espèceBuffer = await readFile(join(DATA_DIR, 'liste-espèces-protégées.csv'))
    /** @type {import("../../types/especes").EspèceProtégéeStrings[]} */
    const listeEspèces = dsvFormat(';').parse(espèceBuffer.toString())

    return new Map(listeEspèces.map((espèce) => {
        return [
            espèce['CD_REF'],
            espèceProtégéeStringToEspèceProtégée(espèce)
        ]
    }))
})

/**
 * @returns {Promise<NonNullable<PitchouState['ActivitésMéthodesMoyensDePoursuite']>> }
 */
export const chargerActivitésMéthodesMoyensDePoursuite = memoize(async function chargerActivitésMéthodesMoyensDePoursuite() {
    const activitésBuffer = await readFile(join(DATA_DIR, 'activites-methodes-moyens-de-poursuite.ods'))
    return await construireActivitésMéthodesMoyensDePoursuite(activitésBuffer)
})


/**
 * Renvoie la liste des espèces impactées renseignées dans le fichier ods des espèces impactées en entrée
 * @param {Pick<Fichier, "contenu" | "nom">} fichier
  * @param {EspèceImpactée['déclaration_espèces_impactées']} déclaration_espèces_impactées
 * @returns {Promise<EspèceImpactéeInitializer[]>}
 */
export async function récupérerEspècesImpactéesFromFichierODS(fichier, déclaration_espèces_impactées) {
    const [
        espèceParCD_REF, 
        { activités, méthodes, moyensDePoursuite }
    ] = await Promise.all(
        [
            chargerListeEspèceParCD_REF(), 
            chargerActivitésMéthodesMoyensDePoursuite()
        ]
    )

    const fichierContenu = fichier.contenu

    if (fichierContenu === null) {
        throw new Error(`Le fichier "${fichier.nom}" des espèces impactées a un contenu null.`)
    }

    const descriptionMenacesEspèces = await importDescriptionMenacesEspècesFromOdsArrayBuffer(
        // @ts-expect-error, cette fonction accepte bien un Buffer (et pas qu'un ArrayBuffer) 
        // mais le typage de la fonction odfjs appelée n'est pas assez précis
        // cf https://github.com/odfjs/odfjs/issues/26
        fichierContenu,
        espèceParCD_REF,
        activités,
        méthodes,
        moyensDePoursuite
    )
    console.log('descriptionMenacesEspèces', descriptionMenacesEspèces)

    const espècesImpactées = fromDescriptionMenacesEspècesToEspècesImpactées(descriptionMenacesEspèces, déclaration_espèces_impactées)

    return espècesImpactées
}

/**
 * @param {DescriptionMenacesEspèces} descriptionMenacesEspèces
 * @param {EspèceImpactée['déclaration_espèces_impactées']} déclaration_espèces_impactées
 * @returns {EspèceImpactéeInitializer[]}
 */
function fromDescriptionMenacesEspècesToEspècesImpactées(descriptionMenacesEspèces, déclaration_espèces_impactées) {
    /** @type {EspèceImpactéeInitializer[]} */
    const espècesImpactées = []
    const { oiseau, flore, "faune non-oiseau": fauneNonOiseau } = descriptionMenacesEspèces

    if (oiseau) {
        for (const { activité, espèce, moyenDePoursuite, méthode, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit } of oiseau) {
            const [nombre_individus_min, nombre_individus_max] = récupérerMinMaxFromNombreIndividus(nombreIndividus);
    
            /** @type {EspèceImpactéeInitializer} */
            const espèceImpactée = {
                déclaration_espèces_impactées,
                CD_REF: espèce.CD_REF,
                activité: activité?.["Identifiant Pitchou"],
                moyen_de_poursuite: moyenDePoursuite?.Code,
                méthode: méthode?.Code,
                surface_habitat_détruit: surfaceHabitatDétruit,
                nombre_nids: nombreNids,
                nombre_œufs: nombreOeufs,
                nombre_individus_min,
                nombre_individus_max
            }
    
            espècesImpactées.push(espèceImpactée)
        }
    }

    if (flore) {  
        for (const { activité, espèce, nombreIndividus, surfaceHabitatDétruit } of flore) {
            const [nombre_individus_min, nombre_individus_max] = récupérerMinMaxFromNombreIndividus(nombreIndividus)
    
            /** @type {EspèceImpactéeInitializer} */
            const espèceImpactée = {
                déclaration_espèces_impactées,
                CD_REF: espèce.CD_REF,
                activité: activité?.["Identifiant Pitchou"],
                surface_habitat_détruit: surfaceHabitatDétruit,
                nombre_individus_min,
                nombre_individus_max
            }
            espècesImpactées.push(espèceImpactée)
        }
    }

    if (fauneNonOiseau) {
        for (const { activité, espèce, moyenDePoursuite, méthode, nombreIndividus, surfaceHabitatDétruit } of fauneNonOiseau) {
            const [nombre_individus_min, nombre_individus_max] = récupérerMinMaxFromNombreIndividus(nombreIndividus)
    
            /** @type {EspèceImpactéeInitializer} */
            const espèceImpactée = {
                déclaration_espèces_impactées,
                CD_REF: espèce.CD_REF,
                activité: activité?.["Identifiant Pitchou"],
                moyen_de_poursuite: moyenDePoursuite?.Code,
                méthode: méthode?.Code,
                surface_habitat_détruit: surfaceHabitatDétruit,
                nombre_individus_min,
                nombre_individus_max
            }
    
            espècesImpactées.push(espèceImpactée)
        }
    }


    return espècesImpactées
}

/**
 * @param {string | undefined} nombreIndividus
 * @returns {[number | undefined, number | undefined]}
 */
function récupérerMinMaxFromNombreIndividus(nombreIndividus) {
    const [min, max] = nombreIndividus?.trim() ? nombreIndividus.split('-').map(n => parseInt(n)) : [undefined, undefined]

    return [min, max]
}