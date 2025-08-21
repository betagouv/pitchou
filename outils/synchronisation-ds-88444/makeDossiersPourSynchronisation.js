/** @import {DossierPourSynchronisation, DonnéesPersonnesEntreprisesInitializer, DossierEntreprisesPersonneInitializersPourInsert, DossierEntreprisesPersonneInitializersPourUpdate, DossierPourInsert} from '../../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */
/** @import {DonnéesSupplémentairesPourCréationDossier} from '../../scripts/front-end/actions/importDossierUtils.js' */

/** @import {DossierDemarcheSimplifiee88444, AnnotationsPriveesDemarcheSimplifiee88444} from '../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {DossierDS88444, Champs88444, Traitement} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */

/** @import Dossier, {DossierInitializer, DossierMutator} from '../../scripts/types/database/public/Dossier.ts' */
/** @import {PersonneInitializer} from '../../scripts/types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../../scripts/types/database/public/Entreprise.ts' */
/** @import {default as ÉvènementPhaseDossier, VNementPhaseDossierInitializer as ÉvènementPhaseDossierInitializer} from '../../scripts/types/database/public/ÉvènementPhaseDossier.ts' */


import assert from 'node:assert/strict'
import { déchiffrerDonnéesSupplémentairesDossiers } from '../../scripts/server/démarches-simplifiées/chiffrerDéchiffrerDonnéesSupplémentaires.js'
import { makeColonnesCommunesDossierPourSynchro } from './makeColonnesCommunesDossierPourSynchro.js'

/**
 * Récupère les données d'un dossier DS nécessaires pour créer les personnes et les entreprises (déposants et demandeurs) en base de données
 * @param {DossierDS88444} dossierDS
 * @param {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToChampDS
 * @returns {DonnéesPersonnesEntreprisesInitializer}
 */
function getDonnéesPersonnesEntreprises(dossierDS, pitchouKeyToChampDS) {
    const {
        demandeur,
        champs,
    } = dossierDS

    /** 
     * Champs 
     */
    /** @type {Map<string | undefined, Champs88444>} */
    /** @type {Map<string | undefined, any>} */
    const champById = new Map()
    for (const champ of champs) {
        champById.set(champ.id, champ)
    }

    /*
    Déposant 
 
    Le déposant est la personne qui dépose le dossier sur DS
    Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique 
    qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose 
    le dossier
    Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur
 
    Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" 
    (qui est différent de notre "demandeur")
 
    */
    /** @type {PersonneInitializer} */
    let déposant;
    {
        const { prenom: prénoms, nom, email } = demandeur
        déposant = {
            prénoms,
            nom,
            email: email === '' ? undefined : email
        }
    }

    /*
    Demandeur
 
    Personne physique ou morale qui formule la demande de dérogation espèces protégées
    */
    /** @type {PersonneInitializer | undefined} */
    /** let demandeur_personne_physique = undefined; */
    /** @type {Entreprise | undefined} */
    let demandeur_personne_morale = undefined

    const SIRETChamp = champById.get(pitchouKeyToChampDS.get('Numéro de SIRET'))
    if (SIRETChamp) {
        const etablissement = SIRETChamp.etablissement
        if (etablissement) {
            const { siret, address = {}, entreprise = {} } = etablissement
            const { streetAddress, postalCode, cityName } = address
            const { raisonSociale } = entreprise


            demandeur_personne_morale = {
                siret,
                raison_sociale: raisonSociale,
                adresse: `${streetAddress}\n${postalCode} ${cityName}`
            }
        }
    }

    return {
        déposant,
        demandeur_personne_morale,
        demandeur_personne_physique: undefined,
    }

}

/**
 * Renvoie la liste des dossiers DS à initialiser la liste des dossiers DS à modifier à partir de la liste complète des dossiers DS à synchroniser.
 * La condition "ce dossier est un dossier à initialiser" se fait en vérifiant que le numéro de Démarches Simplifiées du dossier n'existe pas déjà en base de données.
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<Dossier['number_demarches_simplifiées'], Dossier['id']>} dossierNumberToDossierId
 * @returns {{ dossiersDSAInitialiser: DossierDS88444[], dossiersDSAModifier: DossierDS88444[] }} 
 */
function splitDossiersEnAInitialiserAModifier(dossiersDS, dossierNumberToDossierId) {
    /** @type {DossierDS88444[]} */
    let dossiersDSAInitialiser = []
    /** @type {DossierDS88444[]} */
    let dossiersDSAModifier = []

    dossiersDS.forEach((dossier) => {
        if (dossierNumberToDossierId.has(String(dossier.number))) {
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
 * @returns {Promise<DossierInitializer>}
 */
async function makeChampsDossierPourInitialisation(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS) {
    const données_supplémentaires_à_déchiffrer = dossierDS?.champs.find((champ) => champ.label === 'NE PAS MODIFIER - Données techniques associées à votre dossier')?.stringValue

    /**
     * POUR IMPORT DOSSIERS HISTORIQUES
     * Récupérer les données supplémentaires dans la question 'NE PAS MODIFIER - Données techniques associées à votre dossier'
     */
    /** @type {DonnéesSupplémentairesPourCréationDossier | undefined} */
    let données_supplémentaires
    try {
        données_supplémentaires = données_supplémentaires_à_déchiffrer ? JSON.parse(await déchiffrerDonnéesSupplémentairesDossiers(données_supplémentaires_à_déchiffrer)) : undefined

        if (données_supplémentaires) {
            // Ces données seront utilisées plus tard pour remplir des champs en base de données
            console.log("Il y a des données supplémentaires dans le dossier avec pour identifiant DS " + dossierDS.id + " : ", { données_supplémentaires })
        }
    } catch (erreur) {
        console.warn(`Une erreur est survenue pendant le déchiffrage des données supplémentaires: ${erreur}`)
    }

    return {
        ...makeColonnesCommunesDossierPourSynchro(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS),
        date_dépôt: données_supplémentaires?.date_dépôt ?? dossierDS.dateDepot
    }
}


/**
 * Converti les "state" des "traitements" DS vers les phases Pitchou
 * Il n'existe pas de manière automatique de d'amener vers l'état "Vérification dossier" depuis DS
 * 
 * @param {Traitement['state']} DSTraitementState
 * @returns {import('../../scripts/types/API_Pitchou.ts').DossierPhase}
 */
function traitementPhaseToDossierPhase(DSTraitementState){
    if(DSTraitementState === 'en_construction')
        return "Accompagnement amont"
    if(DSTraitementState === 'en_instruction')
        return "Instruction"
    if(DSTraitementState === 'accepte')
        return "Contrôle"
    if(DSTraitementState === 'sans_suite')
        return "Classé sans suite"
    if(DSTraitementState === 'refuse')
        return "Obligations terminées"

    throw `Traitement phase non reconnue: ${DSTraitementState}`
}

/**
 * 
 * @param {DossierDS88444['traitements']} traitements 
 * @param {Dossier['id']} [dossierId]
 */
function makeÉvènementsPhaseDossierFromTraitementsDS(traitements, dossierId){
    /** @type {DossierPourInsert['évènement_phase_dossier']} */
    const évènementsPhaseDossier = [];
    
    for(const {dateTraitement, state, emailAgentTraitant, motivation} of traitements){
        évènementsPhaseDossier.push({
            phase: traitementPhaseToDossierPhase(state),
            dossier: dossierId,
            horodatage: new Date(dateTraitement),
            cause_personne: null, // signifie que c'est l'outil de sync DS qui est la cause
            DS_emailAgentTraitant: emailAgentTraitant,
            DS_motivation: motivation
        })
    }

    return évènementsPhaseDossier
}


/**
 * Récupère les données brutes des dossiers depuis Démarches Simplifiées
 * puis les transforme au format attendu par l'application
 * afin de permettre leur insertion ou mise à jour en base de données.
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<Dossier['number_demarches_simplifiées'], Dossier['id']>} numberDSDossiersDéjàExistantsEnBDD
 * @param {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToChampDS - Mapping des clés Pitchou vers les IDs de champs DS
 * @param {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToAnnotationDS - Mapping des clés Pitchou vers les IDs d'annotations DS
 * @returns {Promise<{ dossiersAInitialiserPourSynchro: DossierEntreprisesPersonneInitializersPourInsert[], dossiersAModifierPourSynchro: DossierEntreprisesPersonneInitializersPourUpdate[] }>} 
 */
export async function makeDossiersPourSynchronisation(dossiersDS, numberDSDossiersDéjàExistantsEnBDD, pitchouKeyToChampDS, pitchouKeyToAnnotationDS) {
    const { dossiersDSAInitialiser, dossiersDSAModifier } = splitDossiersEnAInitialiserAModifier(dossiersDS, numberDSDossiersDéjàExistantsEnBDD)

    /** @type {Promise<DossierEntreprisesPersonneInitializersPourInsert>[]} */
    const dossiersAInitialiserPourSynchroP = dossiersDSAInitialiser.map((dossierDS) => {
            const champsDossierPourInitP = makeChampsDossierPourInitialisation(
                dossierDS,
                pitchouKeyToChampDS,
                pitchouKeyToAnnotationDS
            )

            const évènement_phase_dossier = makeÉvènementsPhaseDossierFromTraitementsDS(dossierDS.traitements)

            return champsDossierPourInitP.then(champsDossierPourInit => ({
                dossier: {
                    ...champsDossierPourInit,
                    ...getDonnéesPersonnesEntreprises(dossierDS, pitchouKeyToChampDS)
                },
                évènement_phase_dossier
            }))
        })


    /** @type {DossierEntreprisesPersonneInitializersPourUpdate[]} */
    const dossiersAModifierPourSynchro = dossiersDSAModifier.map((dossierDS) => {
        const dossierId = numberDSDossiersDéjàExistantsEnBDD.get(String(dossierDS.number))

        if(!dossierId){
            throw new Error(`dossier.id non trouvé pour dossier DS ${dossierDS.number} qui est en base de données`)
        }

        const dossierPartiel = makeColonnesCommunesDossierPourSynchro(
            dossierDS,
            pitchouKeyToChampDS,
            pitchouKeyToAnnotationDS
        )

        const évènement_phase_dossier = makeÉvènementsPhaseDossierFromTraitementsDS(dossierDS.traitements, dossierId)

        return({
            dossier: {
                ...dossierPartiel,
                ...getDonnéesPersonnesEntreprises(dossierDS, pitchouKeyToChampDS),
            },
            évènement_phase_dossier
        })
    })


    const dossiersAInitialiserPourSynchro = await Promise.all(dossiersAInitialiserPourSynchroP)

    return {
        dossiersAInitialiserPourSynchro,
        dossiersAModifierPourSynchro
    }
}