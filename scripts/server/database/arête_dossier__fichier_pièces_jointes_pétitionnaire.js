/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Dossier, DossierId} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {DossierDS88444, DSFile} from '../../types/démarche-numérique/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../types/démarche-numérique/schema.ts' */
/** @import {DossierDemarcheNumerique88444} from '../../types/démarche-numérique/Démarche88444.ts' */
/** @import {Knex} from 'knex' */

import trouverCandidatsFichiersÀTélécharger from '../../../outils/synchronisation-ds/trouverCandidatsFichiersÀTélécharger.js'
import {directDatabaseConnection} from '../database.js'

/** @typedef {keyof DossierDemarcheNumerique88444} ChampFormulaire */

/**
 * 
 * @param {Map<Dossier['id'], Fichier['id'][]>} fichiersPiècesJointesPétitionnaireParNuméroDossier
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<DossierDS88444['number'], Dossier['id']>} dossierIdByDS_number 
 * @param {Map<keyof DossierDemarcheNumerique88444, ChampDescriptor['id']>} pitchouKeyToChampDS
 * @param {ChampFormulaire[]} champsAvecPiècesJointes
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444(fichiersPiècesJointesPétitionnaireParNuméroDossier, dossiersDS, dossierIdByDS_number, pitchouKeyToChampDS, champsAvecPiècesJointes, databaseConnection = directDatabaseConnection){


    /** @type {Map<DossierDS88444['number'], DSFile[]>[]} */
    let descriptionsFichiers = []

    for (const champ of champsAvecPiècesJointes){
        /** @type {ChampDescriptor['id'] | undefined} */
        const champId = pitchouKeyToChampDS.get(champ)
        if(!champId){
            throw new Error(`champId for ${champ} is undefined`)
        }
        const candidat = trouverCandidatsFichiersÀTélécharger(dossiersDS, champId)

        descriptionsFichiers.push(candidat)
    }

    /** @type {Set<DossierId>} */
    // @ts-ignore
    const dossierIds = new Set(dossiersDS.map(({number}) => dossierIdByDS_number.get(number) ))

    /** @type {Set<string>} */
    const checksumsDS = new Set(
        ...descriptionsFichiers.map((descriptionFichier) => [...descriptionFichier.values()].map(dsfiles => dsfiles.map(dsfile => dsfile.checksum)).flat()),
    )

    console.log('dossierIds', dossierIds)
    console.log('checksumsDS', checksumsDS)

    // Trouver les fichiers qui sont en base de données, mais ne sont plus dans DS
    const fichierIdsEnBDDMaisPlusDansDS = await databaseConnection('dossier')
        .select(['fichier.id as id'])
        .leftJoin('arête_dossier__fichier_pièces_jointes_pétitionnaire', {'arête_dossier__fichier_pièces_jointes_pétitionnaire.dossier': 'dossier.id'})
        .leftJoin('fichier', {'fichier.id': 'arête_dossier__fichier_pièces_jointes_pétitionnaire.fichier'})
        .whereIn('dossier.id', [...dossierIds])
        .andWhere('DS_checksum', 'not in', [...checksumsDS])

    console.log('fichier ids orphelins', fichierIdsEnBDDMaisPlusDansDS)

    
    /** @type {Promise<any>} */
    let fichiersOrphelinsNettoyés = Promise.resolve()

    if(fichierIdsEnBDDMaisPlusDansDS.length >= 1){
        // supprimer les fichier 
        // les arêtes correspondantes sont supprimées via le ON DELETE CASCADE
        fichiersOrphelinsNettoyés = databaseConnection('fichier')
            .delete()
            .whereIn('id', fichierIdsEnBDDMaisPlusDansDS.map(f => f.id))
    }


    const arêtesFichierDossierPiècesJointePétitionnaires = [...fichiersPiècesJointesPétitionnaireParNuméroDossier]
        .map(([dossierId, fichierIds]) => fichierIds.map(fichierId => ({fichier: fichierId, dossier: dossierId})))
        .flat()

    console.log('arêtesFichierDossierPiècesJointePétitionnaires', arêtesFichierDossierPiècesJointePétitionnaires)

    /** @type {Promise<any>} */
    let nouveauxFichiersSynchronisés = Promise.resolve()

    if(arêtesFichierDossierPiècesJointePétitionnaires.length >= 1){
        nouveauxFichiersSynchronisés = databaseConnection('arête_dossier__fichier_pièces_jointes_pétitionnaire')
            .insert(arêtesFichierDossierPiècesJointePétitionnaires)
    }

    return Promise.all([
        fichiersOrphelinsNettoyés,
        nouveauxFichiersSynchronisés
    ])

}
