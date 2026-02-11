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

/** @typedef {keyof DossierDemarcheNumerique88444} ChampFormulaire */

/**
 * Télécharge les pièces jointes au dossier fournies par le pétitionnaire pour la démarche 88444
 * 
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<keyof DossierDemarcheNumerique88444, ChampDescriptor['id']>} pitchouKeyToChampDS
 * @param {ChampFormulaire[]} champsAvecPiècesJointes
 * @param {Knex.Transaction | Knex} databaseConnection
 * @returns {Promise<Map<DossierDS88444['number'], Fichier['id'][]>>}
 */
export async function récupérerPiècesJointesPétitionnaire88444(dossiersDS, pitchouKeyToChampDS, champsAvecPiècesJointes, databaseConnection){
    /** @type {Awaited<ReturnType<récupérerPiècesJointesPétitionnaire88444>>} */
    const fichiersP = new Map()

    for (const champ of champsAvecPiècesJointes) {
        const champId = pitchouKeyToChampDS.get(champ)
        if(!champId){
            throw new Error(`champId for ${champ} is undefined`)
        }
        const fichiersFromDossierP = téléchargerNouveauxFichiersFromChampId(
            dossiersDS,
            champId,
            databaseConnection
        )

        const fichiersFromDossier = await fichiersFromDossierP

        if(fichiersFromDossier){
            for(const [number, fichierIds] of fichiersFromDossier){
                const fichiersIdsDéjàLà = fichiersP.get(number) || []
                fichiersP.set(number, [...fichierIds, ...fichiersIdsDéjàLà])
            }
        }
    }

    return fichiersP
}