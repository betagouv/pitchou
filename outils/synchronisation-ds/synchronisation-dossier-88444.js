//@ts-check

/** @import {DossierDS88444} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {default as Fichier} from '../../scripts/types/database/public/Fichier.ts' */
/** @import {Knex} from 'knex' */
/** @import {AnnotationsPriveesDemarcheSimplifiee88444} from '../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */

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
 * Télécharge les nouveaux fichiers pour 88444: Avis CSRPN/CNPN, Saisines, Avis conforme Ministre pour les dossiers 
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToAnnotationDS
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 * @returns {Promise<{
 *  fichiersAvisCSRPN_CNPN_Téléchargés: Map<DossierDS88444['number'], Fichier['id'][]> | undefined,
 *  fichiersSaisinesCSRPN_CNPN_Téléchargés: Map<DossierDS88444['number'], Fichier['id'][]> | undefined,
 *  fichiersAvisConformeMinistreTéléchargés: Map<DossierDS88444['number'], Fichier['id'][]> | undefined,
 * }>} 
 */
export async function récupérerFichiersAvisEtSaisines88444(dossiersDS, pitchouKeyToAnnotationDS, laTransactionDeSynchronisationDS){
    /** @type {ChampDescriptor['id'] | undefined} */
    const fichierAvisExpertAnnotationId = pitchouKeyToAnnotationDS.get('Avis CSRPN/CNPN')
    if(!fichierAvisExpertAnnotationId){
        throw new Error('fichierAvisExpertAnnotationId is undefined')
    }

    /** @type {ChampDescriptor['id'] | undefined} */
    const fichierSaisineExpertAnnotationId = pitchouKeyToAnnotationDS.get("Saisine de l'instructeur")
    if(!fichierSaisineExpertAnnotationId){
        throw new Error('fichierSaisineExpertAnnotationId is undefined')
    }

    /** @type {ChampDescriptor['id'] | undefined} */
    const fichierAvisConformeMinistreAnnotationId = pitchouKeyToAnnotationDS.get('Avis conforme Ministre')
    if(!fichierAvisConformeMinistreAnnotationId){
        throw new Error('fichierAvisConformeMinistreAnnotationId is undefined')
    }

    const fichiersAvisCSRPN_CNPNP = téléchargerNouveauxFichiersFromChampId(
        dossiersDS,
        fichierAvisExpertAnnotationId,
        laTransactionDeSynchronisationDS
    )

    const fichiersSaisinesCSRPN_CNPNP = téléchargerNouveauxFichiersFromChampId(
        dossiersDS,
        fichierSaisineExpertAnnotationId,
        laTransactionDeSynchronisationDS
    )

    const fichiersAvisConformeMinistreP = téléchargerNouveauxFichiersFromChampId(
        dossiersDS,
        fichierAvisConformeMinistreAnnotationId,
        laTransactionDeSynchronisationDS
    )

    const [fichiersAvisCSRPN_CNPN_Téléchargés,
        fichiersSaisinesCSRPN_CNPN_Téléchargés,
        fichiersAvisConformeMinistreTéléchargés] = await Promise.all([
            fichiersAvisCSRPN_CNPNP,
            fichiersSaisinesCSRPN_CNPNP,
            fichiersAvisConformeMinistreP
    ])

    return {
        fichiersAvisCSRPN_CNPN_Téléchargés,
        fichiersSaisinesCSRPN_CNPN_Téléchargés,
        fichiersAvisConformeMinistreTéléchargés
    }
}


