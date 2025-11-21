/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Dossier} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {DossierDS88444, DSFile} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {DossierDemarcheSimplifiee88444} from '../../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {Knex} from 'knex' */

import trouverCandidatsFichiersÀTélécharger from '../../../outils/synchronisation-ds/trouverCandidatsFichiersÀTélécharger.js'
import {directDatabaseConnection} from '../database.js'

/**
 * 
 * @param {Map<Dossier['id'], Fichier['id'][]>} fichiersPiècesJointesPétitionnaireParNuméroDossier
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToChampDS
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444(fichiersPiècesJointesPétitionnaireParNuméroDossier, dossiersDS, pitchouKeyToChampDS, databaseConnection = directDatabaseConnection){

    /** @type {ChampDescriptor['id'] | undefined} */
    const fichierPiècesJointesChampId = pitchouKeyToChampDS.get('Dépot du dossier complet de demande de dérogation')
    if(!fichierPiècesJointesChampId){
        throw new Error('fichierPiècesJointesChampId is undefined')
    }

    /** @type {ChampDescriptor['id'] | undefined} */
    const fichierPiècesJointesComplémentairesChampId = pitchouKeyToChampDS.get('Si nécessaire, vous pouvez déposer ici des pièces jointes complétant votre demande')
    if(!fichierPiècesJointesComplémentairesChampId){
        throw new Error('fichierPiècesJointesComplémentairesChampId is undefined')
    }

    /** @type {Map<DossierDS88444['number'], DSFile[]>} */
    const descriptionFichiersDansDS_1 = trouverCandidatsFichiersÀTélécharger(dossiersDS, fichierPiècesJointesChampId)
    /** @type {Map<DossierDS88444['number'], DSFile[]>} */
    const descriptionFichiersDansDS_2 = trouverCandidatsFichiersÀTélécharger(dossiersDS, fichierPiècesJointesComplémentairesChampId)

    throw "recups les dossierIds et pas des DossierDS88444['number']"

    const dossierIds = new Set([
        ...descriptionFichiersDansDS_1.keys(),
        ...descriptionFichiersDansDS_2.keys(),
    ])

    const checksumsDS = new Set([
        ...[...descriptionFichiersDansDS_1.values()].map(dsfiles => dsfiles.map(dsfile => dsfile.checksum)).flat(),
        ...[...descriptionFichiersDansDS_2.values()].map(dsfiles => dsfiles.map(dsfile => dsfile.checksum)).flat()
    ])

    console.log('dossierIds', dossierIds)
    console.log('checksumsDS', checksumsDS)

    // Trouver les fichiers qui sont en base de données, mais ne sont plus dans DS
    const fichierIdsEnBDDMaisPlusDansDSP = databaseConnection('dossier')
        .join('arête_dossier__fichier_pièces_jointes_pétitionnaire', {'arête_dossier__fichier_pièces_jointes_pétitionnaire.dossier': 'dossier.id'})
        .join('fichier', {'fichier.id': 'arête_dossier__fichier_pièces_jointes_pétitionnaire.fichier'})
        .select(['fichier.id as id'])
        .whereIn('dossier.id', [...dossierIds])
        .whereNotIn('DS_checksum', [
            // null correspond au checksum_DS des fichiers qui ne viennent pas de DS
            // et donc que l'on souhaite garder
            null, 
            ...checksumsDS]
        )

    await fichierIdsEnBDDMaisPlusDansDSP.then(ids => console.log('fichier ids orphelins', ids))
    throw "STOP"


    // supprimer les fichier 
    // les arêtes correspondantes sont supprimées via un ON DELETE CASCADE


/*

    arêtesFichierDossierPiècesJointePétitionnaires.length > 0
        ? databaseConnection('arête_dossier__fichier_pièces_jointes_pétitionnaire').insert(arêtesFichierDossierPiècesJointePétitionnaires)
        : Promise.resolve([]),

    


    // Supprimer les fichiers qui étaient attachés à un dossier et ne sont plus pertinents
    return Promise.all(updatePs).then(() => {
        const fichiersOrphelinsIds = fichiersIdPrécédents
            .map(({espèces_impactées}) => espèces_impactées)

        if(fichiersOrphelinsIds.length >= 1){
            return databaseConnection('fichier')
                .delete()
                .whereIn('id', fichiersOrphelinsIds)
        }
    })
        */

}
