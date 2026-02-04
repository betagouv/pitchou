//@ts-check

/** @import {DossierDS88444} from '../../scripts/types/démarche-numérique/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarche-numérique/schema.ts' */
/** @import {default as Fichier} from '../../scripts/types/database/public/Fichier.ts' */
/** @import {Knex} from 'knex' */
/** @import { DossierDemarcheNumerique88444 } from '../../scripts/types/démarche-numérique/Démarche88444.ts' */

import { téléchargerNouveauxFichiersFromChampId, téléchargerNouveauxFichiersEspècesImpactées } from './téléchargerNouveauxFichiersParType.js'



/**
 * Télécharge les nouveaux fichiers "Espèces impactées" pour la démarche 88444
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<string, ChampDescriptor['id']>} pitchouKeyToChampDS
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>}
 */
export function récupérerFichiersEspècesImpactées88444(dossiersDS, pitchouKeyToChampDS, laTransactionDeSynchronisationDS){
    /** @type {ChampDescriptor['id'] | undefined} */
    const fichierEspècesImpactéeChampId = pitchouKeyToChampDS.get('Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes')
    if(!fichierEspècesImpactéeChampId){
        throw new Error('fichierEspècesImpactéeChampId is undefined')
    }

    return téléchargerNouveauxFichiersEspècesImpactées(
        dossiersDS,
        fichierEspècesImpactéeChampId,
        laTransactionDeSynchronisationDS
    )
}


/**
 * Télécharge les pièces jointes au dossier fournies par le pétitionnaire pour la démarche 88444
 * 
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<keyof DossierDemarcheNumerique88444, ChampDescriptor['id']>} pitchouKeyToChampDS
 * @param {Knex.Transaction | Knex} databaseConnection
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id'][]>>}
 */
export async function récupérerPiècesJointesPétitionnaire88444(dossiersDS, pitchouKeyToChampDS, databaseConnection){

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


    const fichiersPiècesJointesP = téléchargerNouveauxFichiersFromChampId(
        dossiersDS,
        fichierPiècesJointesChampId,
        databaseConnection
    )

    const fichiersPiècesJointesComplémentairesP = téléchargerNouveauxFichiersFromChampId(
        dossiersDS,
        fichierPiècesJointesComplémentairesChampId,
        databaseConnection
    )

    /** @type {Awaited<ReturnType<récupérerPiècesJointesPétitionnaire88444>>} */
    const res = new Map()

    const fichiersPiècesJointes = await fichiersPiècesJointesP
    if(fichiersPiècesJointes){
        for(const [number, fichierIds] of fichiersPiècesJointes){
            res.set(number, fichierIds)
        }
    }

    const fichiersPiècesJointesComplémentaires = await fichiersPiècesJointesComplémentairesP
    if(fichiersPiècesJointesComplémentaires){
        for(const [number, fichierIds] of fichiersPiècesJointesComplémentaires){
            const fichiersIdsDéjàLà = res.get(number) || []
            res.set(number, [...fichierIds, ...fichiersIdsDéjàLà])
        }
    }
    
    return res
}