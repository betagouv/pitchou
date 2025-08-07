/** @import {DossierDS88444} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {DossierInitializer, DossierMutator} from '../../scripts/types/database/public/Dossier.ts' */
/** @import  {DossierPourSynchronisation, DécisionAdministrativeAnnotation88444} from '../../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */
/** @import {DonnéesSupplémentaires} from '../../scripts/front-end/actions/importDossierUtils.js' */
/** @import Dossier from '../../scripts/types/database/public/Dossier.ts' */
/** @import {DossierDemarcheSimplifiee88444, AnnotationsPriveesDemarcheSimplifiee88444} from '../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */

import assert from 'node:assert/strict'
import { déchiffrerDonnéesSupplémentairesDossiers } from '../../scripts/server/démarches-simplifiées/chiffrerDéchiffrerDonnéesSupplémentaires.js'
import { remplirChampsCommunsPourSynchro } from './remplirChampsCommunsPourSynchro.js'

/**
 * Renvoie la liste des dossiers DS à initialiser la liste des dossiers DS à modifier à partir de la liste complète des dossiers DS à synchroniser.
 * La condition "ce dossier est un dossier à initialiser" se fait en vérifiant que le numéro de Démarches Simplifiées du dossier n'existe pas déjà en base de données.
 * @param {DossierDS88444[]} dossiersDS
 * @param {Set<Dossier['number_demarches_simplifiées']>} numberDSDossiersDéjàExistantsEnBDD
 * @returns {{ dossiersDSAInitialiser: DossierDS88444[], dossiersDSAModifier: DossierDS88444[] }} 
 */
function getDossiersAInitialiserDossiersAModifier(dossiersDS, numberDSDossiersDéjàExistantsEnBDD) {
    /** @type {DossierDS88444[]} */
    let dossiersDSAInitialiser = []
    /** @type {DossierDS88444[]} */
    let dossiersDSAModifier = []

    dossiersDS.forEach((dossier) => {
        if (numberDSDossiersDéjàExistantsEnBDD.has(String(dossier.number))) {
            dossiersDSAModifier.push(dossier)
        } else {
            dossiersDSAInitialiser.push(dossier)
        }
    })

    assert.deepEqual(
    dossiersDSAModifier.length + dossiersDSAInitialiser.length, 
    dossiersDS.length, 
    `Une erreur est survenue lors de la séparation des dossiers DS en dossiers DS à initialiser (${dossiersDSAInitialiser.length} dossiers à modifier) et en dossiers DS à modifier (${dossiersDSAModifier.length} dossiers à modifier)`)

    return { dossiersDSAInitialiser, dossiersDSAModifier }
}

/**
 * Renvoyer le dossier rempli des champs obligatoires pour l'initialisation d'un nouveau dossier
 * @param {DossierDS88444} dossierDS
 * @param {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToChampDS - Mapping des clés Pitchou vers les IDs de champs DS
 * @param {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToAnnotationDS - Mapping des clés Pitchou vers les IDs d'annotations DS
 * @param {Map<string | null, DécisionAdministrativeAnnotation88444>} donnéesDécisionAdministrativeParNuméroDossier - Map pour stocker les données de décision administrative
 * @returns {Promise<Omit<DossierPourSynchronisation<DossierInitializer>, "demandeur_personne_physique">>}
 */
async function remplirChampsPourInitialisation(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS, donnéesDécisionAdministrativeParNuméroDossier) {
    const données_supplémentaires = dossierDS?.champs.find((champ) => champ.label === 'NE PAS MODIFIER - Données techniques associées à votre dossier')?.stringValue

    /**
     * POUR IMPORT DOSSIERS HISTORIQUES
     * Récupérer les données supplémentaires dans la question 'NE PAS MODIFIER - Données techniques associées à votre dossier'
     */
    /** @type {DonnéesSupplémentaires} */
    const données_supplémentaires_déchiffrées = données_supplémentaires ? JSON.parse(await déchiffrerDonnéesSupplémentairesDossiers(données_supplémentaires)) : undefined

    if (données_supplémentaires_déchiffrées) {
        // Ces données seront utilisées plus tard pour remplir des champs en base de données
        console.log("Il y'a des données supplémentaires dans le dossier DS n°" + dossierDS.number + " : ", { données_supplémentaires_déchiffrées })
    }

    return {
        ...remplirChampsCommunsPourSynchro(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS, donnéesDécisionAdministrativeParNuméroDossier),
        date_dépôt: données_supplémentaires_déchiffrées?.date_dépôt ?? dossierDS.dateDepot
    }
}


/**
 * @param {DossierDS88444[]} dossiersDS
 * @param {Set<string>} numberDSDossiersDéjàExistantsEnBDD
 * @param {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToChampDS - Mapping des clés Pitchou vers les IDs de champs DS
 * @param {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToAnnotationDS - Mapping des clés Pitchou vers les IDs d'annotations DS
 * @param {Map<string | null, DécisionAdministrativeAnnotation88444>} donnéesDécisionAdministrativeParNuméroDossier - Map pour stocker les données de décision administrative
 * @returns {Promise<{ dossiersAInitialiserPourSynchro: Omit<DossierPourSynchronisation<DossierInitializer>, "demandeur_personne_physique">[], dossiersAModifierPourSynchro: Omit<DossierPourSynchronisation<DossierMutator>, "demandeur_personne_physique">[] }>} 
 */
export async function getDossiersPourSynchronisation(dossiersDS, numberDSDossiersDéjàExistantsEnBDD, pitchouKeyToChampDS, pitchouKeyToAnnotationDS, donnéesDécisionAdministrativeParNuméroDossier) {
    const { dossiersDSAInitialiser, dossiersDSAModifier } = getDossiersAInitialiserDossiersAModifier(dossiersDS, numberDSDossiersDéjàExistantsEnBDD)

    const dossiersAInitialiserPourSynchro = await Promise.all(dossiersDSAInitialiser.map(async (dossier) => remplirChampsPourInitialisation(dossier, pitchouKeyToChampDS, pitchouKeyToAnnotationDS, donnéesDécisionAdministrativeParNuméroDossier)))

    const dossiersAModifierPourSynchro = dossiersDSAModifier.map((dossier) => remplirChampsCommunsPourSynchro(dossier, pitchouKeyToChampDS, pitchouKeyToAnnotationDS, donnéesDécisionAdministrativeParNuméroDossier))

    return {
        dossiersAInitialiserPourSynchro,
        dossiersAModifierPourSynchro
    }
}