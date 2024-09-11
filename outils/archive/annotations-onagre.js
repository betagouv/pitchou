//@ts-check

import {readFile} from 'node:fs/promises'
import { join } from 'node:path';

import ky from 'ky'
import {getODSTableRawContent, sheetRawContentToObjects} from 'ods-xlsx'

import {toDossierTableauSuiviNouvelleAquitaine2023, dossierSuiviNAVersDossierDS88444, dossierSuiviNAVersAnnotationsDS88444} from '../scripts/import-dossiers-historiques/nouvelle-aquitaine/conversions.js'
import { normalizeNomCommune } from '../scripts/commun/typeFormat.js';
import {listAllDossiersComplets} from '../scripts/server/database.js'
import remplirAnnotations from '../scripts/server/démarches-simplifiées/remplirAnnotations.js'


/** @import { DossierDémarcheSimplifiée88444, GeoAPICommune, GeoAPIDépartement, DossierComplet} from "../scripts/types.js" */
/** @import {DossierTableauSuiviNouvelleAquitaine2023} from '../scripts/import-dossiers-historiques/nouvelle-aquitaine/types.js' */


const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

const tableauSuiviPath = join(import.meta.filename, '../../data/Tableaux de suivi DREP 2023.ods', )


/**
 * 
 * @param {DossierComplet[]} dossiersStockésEnBaseDeDonnées 
 * @param {Partial<DossierDémarcheSimplifiée88444>} dossierPartiel88444DepuisTableauSuivi
 * @returns {DossierComplet | undefined}
 */
function trouverDossierEnBDDCorrespondant(dossiersStockésEnBaseDeDonnées, dossierPartiel88444DepuisTableauSuivi){
    const nomProjetDossierCandidat = dossierPartiel88444DepuisTableauSuivi['Nom du projet']
    const dossiersAvecCeNom = dossiersStockésEnBaseDeDonnées.filter(d => d.nom_dossier === nomProjetDossierCandidat)
    if(dossiersAvecCeNom.length === 0)
        return undefined
    
    if(dossiersAvecCeNom.length === 1)
        return dossiersAvecCeNom[0]
    
    // dossiersAvecCeNom.length >= 2

    const communesDossierTableauSuivi = dossierPartiel88444DepuisTableauSuivi['Commune(s) où se situe le projet']

    if(Array.isArray(communesDossierTableauSuivi)){
        const dossierAvecNomEt1CommuneEnCommun = dossiersAvecCeNom.find(dossierBDD => {
            return communesDossierTableauSuivi
                .some(communeTableauSuivi => (dossierBDD['communes'] || [])
                    //@ts-ignore
                    .some(communeDossierBDD => communeTableauSuivi && communeTableauSuivi.code === communeDossierBDD.code)
                )
        })

        if(dossierAvecNomEt1CommuneEnCommun){
            return dossierAvecNomEt1CommuneEnCommun
        }
    }

    /** @type {GeoAPIDépartement[] | undefined} */
    const départementsDossierTableauSuivi = dossierPartiel88444DepuisTableauSuivi['Département(s) où se situe le projet']
    
    if(Array.isArray(départementsDossierTableauSuivi)){
        const dossierAvecNomEt1DépartementEnCommun = dossiersAvecCeNom.find(dossierBDD => {
            return départementsDossierTableauSuivi
                .some(départementTableauSuivi => (dossierBDD['départements'] || [])
                    .some(départementDossierBDD => départementTableauSuivi && départementTableauSuivi.code === départementDossierBDD)
                )
        })

        if(dossierAvecNomEt1DépartementEnCommun){
            return dossierAvecNomEt1DépartementEnCommun
        }
    }

    return undefined
}

function estImportable(candidat){
    return (
            candidat['Porteur de projet'] || 
            candidat['Nom du projet'] || 
            (Array.isArray(candidat['Localisation']) && candidat['Localisation'].length >= 1)
        )
}

/** @type {[ GeoAPICommune[], GeoAPIDépartement[] ]} */
const [communes, départements] = await Promise.all([
    await ky('https://geo.api.gouv.fr/communes').json(),
    await ky('https://geo.api.gouv.fr/departements').json()
])

/** @type { Map<GeoAPICommune['nom'], GeoAPICommune> } */
const nomToCommune = new Map()

for(const commune of communes){
    nomToCommune.set(normalizeNomCommune(commune.nom), commune)
}

/** @type { Map<GeoAPICommune['nom'], GeoAPIDépartement> } */
const stringToDépartement = new Map()

for(const département of départements){
    stringToDépartement.set(département.code, département)
    stringToDépartement.set(département.nom, département)
}


const tableauSuiviArrayBuffer = (await readFile(tableauSuiviPath)).buffer
const rawContent = await getODSTableRawContent(tableauSuiviArrayBuffer)
const dossierTableauSuiviRaw = rawContent.get("Dossiers en cours")
const dossiersObject = sheetRawContentToObjects(dossierTableauSuiviRaw)
const dossiersTableauSuivi = dossiersObject
    .map(dossier => toDossierTableauSuiviNouvelleAquitaine2023(dossier, nomToCommune, stringToDépartement))
    .filter(estImportable)
const dossiersTableauSuiviAvecNuméroOnagre = dossiersTableauSuivi.filter(d => d['N°ONAGRE de demande'])


const dossierSuiviNAToDossierEtAnnotation88444 = new Map( 
    dossiersTableauSuiviAvecNuméroOnagre.map(d => [d, {
        dossier: dossierSuiviNAVersDossierDS88444(d, new Map(), stringToDépartement),
        annotations: dossierSuiviNAVersAnnotationsDS88444(d)
    }])
)

/** @type {DossierComplet[]} */
const dossiersStockésEnBaseDeDonnées = await listAllDossiersComplets()

console.log('dossiersTableauSuiviAvecNuméroOnagre', dossiersTableauSuiviAvecNuméroOnagre.length)
console.log('dossiersStockésEnBaseDeDonnées', dossiersStockésEnBaseDeDonnées.length)

/** @type {Map<DossierComplet, string>} */
const dossiersTableauDeSuiviVersDossierBDDSansNuméroOnagre = new Map()
const dossiersTableauDeSuiviVersDossierBDDAvecNuméroOnagreDifférent = new Map()
const dossiersTableauDeSuiviDontDossierBDDAvecNuméroOnagreCorrect = new Set()
const dossiersTableauDeSuiviAvecNuméroOnagreSansDossierBDDCorrespondant = new Set()


for(const [dossierTableauSuivi, {dossier: dossierPartiel88444, annotations: annotationsPartielle88444}] of dossierSuiviNAToDossierEtAnnotation88444){
    const dossierEnBaseDeDonnéeCorrespondant = trouverDossierEnBDDCorrespondant(dossiersStockésEnBaseDeDonnées, dossierPartiel88444)

    if(!dossierEnBaseDeDonnéeCorrespondant){
        dossiersTableauDeSuiviAvecNuméroOnagreSansDossierBDDCorrespondant.add(dossierTableauSuivi)
    }
    else{
        //console.log('annotationsPartielle88444', annotationsPartielle88444)
        if(dossierEnBaseDeDonnéeCorrespondant['historique_identifiant_demande_onagre']){
            //console.log(`annotationsPartielle88444['N° Demande ONAGRE']`, annotationsPartielle88444['N° Demande ONAGRE'])
            if(annotationsPartielle88444['N° Demande ONAGRE'] === dossierEnBaseDeDonnéeCorrespondant['historique_identifiant_demande_onagre']){
                dossiersTableauDeSuiviDontDossierBDDAvecNuméroOnagreCorrect.add(dossierTableauSuivi)
            }
            else{
                dossiersTableauDeSuiviVersDossierBDDAvecNuméroOnagreDifférent.set(dossierTableauSuivi, dossierEnBaseDeDonnéeCorrespondant)
            }
        }
        else{
            dossiersTableauDeSuiviVersDossierBDDSansNuméroOnagre.set(dossierEnBaseDeDonnéeCorrespondant, annotationsPartielle88444['N° Demande ONAGRE'])
        }
    }
}

console.log('dossiersTableauDeSuiviVersDossierBDD SansNuméroOnagre', dossiersTableauDeSuiviVersDossierBDDSansNuméroOnagre.size)
console.log('dossiersTableauDeSuiviVersDossierBDD AvecNuméroOnagreDifférent', dossiersTableauDeSuiviVersDossierBDDAvecNuméroOnagreDifférent.size)
console.log('dossiersTableauDeSuiviDontDossierBDDAvecNuméroOnagreCorrect', dossiersTableauDeSuiviDontDossierBDDAvecNuméroOnagreCorrect.size)
console.log('dossiersTableauDeSuiviAvecNuméroOnagreSansDossierBDDCorrespondant', dossiersTableauDeSuiviAvecNuméroOnagreSansDossierBDDCorrespondant.size)

const todo = 30
const annotationsEnAttente = []

dossiersTableauDeSuiviVersDossierBDDSansNuméroOnagre.forEach((numéroOnagre, dossierBDD) => {
    if(annotationsEnAttente.length >= todo){
        return; // early
    }

    const dossierId = dossierBDD.id_demarches_simplifiées

    if(!dossierId){
        throw new TypeError('dossierId manquant')
    }

    const numDS = dossierBDD.number_demarches_simplifiées
    //console.log('numDS numéroOnagre', numDS, dossierId, numéroOnagre)

    const annotations = {
        'N° Demande ONAGRE': numéroOnagre
    }
    
    annotationsEnAttente.push(remplirAnnotations(
        DEMARCHE_SIMPLIFIEE_API_TOKEN,
        {
            dossierId,
            instructeurId: 'SW5zdHJ1Y3RldXItMTAyMjAx',
            annotations
        }
    ))

    console.log('Annotation onagre remplie', numéroOnagre, numDS, `https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numDS}/annotations-privees`)
})

await Promise.all(annotationsEnAttente)

console.log('fin')
process.exit()