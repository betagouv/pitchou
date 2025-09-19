/** @import {DonnéesPersonnesEntreprisesInitializer, DossierEntreprisesPersonneInitializersPourInsert, DossierEntreprisesPersonneInitializersPourUpdate, DossierPourInsert} from '../../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */
/** @import {DossierDemarcheSimplifiee88444, AnnotationsPriveesDemarcheSimplifiee88444} from '../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {DossierDS88444, Champs88444, Traitement} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import Dossier from '../../scripts/types/database/public/Dossier.ts' */
/** @import {PersonneInitializer} from '../../scripts/types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../../scripts/types/database/public/Entreprise.ts' */
/** @import { FichierId } from '../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Fichier} from '../../scripts/types/database/public/Fichier.ts' */
/** @import AvisExpert, {AvisExpertInitializer} from '../../scripts/types/database/public/AvisExpert.ts' */
/** @import DCisionAdministrative ,{DCisionAdministrativeInitializer} from '../../scripts/types/database/public/DécisionAdministrative.ts' */
/** @import { PartialBy }  from '../../scripts/types/tools' */
/** @import {TypeDécisionAdministrative} from '../../scripts/types/API_Pitchou.ts' */
/** @import {DonnéesSupplémentairesPourCréationDossier} from '../../scripts/front-end/actions/importDossierUtils.js' */



import assert from 'node:assert/strict'
import { déchiffrerDonnéesSupplémentairesDossiers } from '../../scripts/server/démarches-simplifiées/chiffrerDéchiffrerDonnéesSupplémentaires.js'
import { makeColonnesCommunesDossierPourSynchro } from './makeColonnesCommunesDossierPourSynchro.js'
import { isAfter } from 'date-fns'
import { normalisationEmail } from '../../scripts/commun/manipulationStrings.js'

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
        nomMandataire = '',
        prenomMandataire = '',
        usager,
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
    /*
    Demandeur
    Personne physique ou morale qui formule la demande de dérogation espèces protégées
    */
    /** @type {PersonneInitializer | undefined} */
    let demandeur_personne_physique = undefined;
    /** @type {Entreprise | undefined} */
    let demandeur_personne_morale = undefined

    /** @type {DossierDemarcheSimplifiee88444['Le demandeur est…'] | undefined} */
    const personneMoraleOuPhysique = champById.get(pitchouKeyToChampDS.get('Le demandeur est…'))?.stringValue
    console.log("personneMoraleOuPhysique", personneMoraleOuPhysique)

    if ((nomMandataire || prenomMandataire) && personneMoraleOuPhysique === 'une personne physique') {
        déposant = {
            prénoms: prenomMandataire,
            nom: nomMandataire,
            email: normalisationEmail(usager.email)
        }
    } else {
        déposant = {
            prénoms: demandeur.prenom,
            nom: demandeur.nom,
            email: demandeur.email ? normalisationEmail(demandeur.email) : undefined,
        }
    }

    if (personneMoraleOuPhysique === "une personne physique") {
        const {prenom, nom} = demandeur

        /** @type {DossierDemarcheSimplifiee88444['Adresse mail de contact'] | undefined} */
        const adresseEmailDeContact = champById.get(pitchouKeyToChampDS.get('Adresse mail de contact'))?.stringValue

        let email = adresseEmailDeContact || demandeur.email || déposant.email

        demandeur_personne_physique = {
            prénoms: prenom,
            nom,
            email: email ? normalisationEmail(email) : undefined,
        }
    }


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
        demandeur_personne_physique,
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
 * @returns {Promise<Partial<DossierPourInsert> & Pick<DossierPourInsert, 'dossier'>>}
 */
async function makeChampsDossierPourInitialisation(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS) {
    const données_supplémentaires_à_déchiffrer = dossierDS?.champs.find((champ) => champ.label === 'NE PAS MODIFIER - Données techniques associées à votre dossier')?.stringValue

    /**
     * POUR IMPORT DOSSIERS HISTORIQUES
     */
    /** @type {DonnéesSupplémentairesPourCréationDossier | undefined} */
    let données_supplémentaires
    try {
        données_supplémentaires = données_supplémentaires_à_déchiffrer ? JSON.parse(await déchiffrerDonnéesSupplémentairesDossiers(données_supplémentaires_à_déchiffrer)) : undefined

        if (données_supplémentaires) {
            // Ces données seront utilisées plus tard pour remplir des champs en base de données
            console.log(`Il y a des données supplémentaires dans le dossier DS`, dossierDS.number, données_supplémentaires)
        }
    } catch (erreur) {
        console.warn(`Une erreur est survenue pendant le déchiffrage des données supplémentaires: ${erreur}`)
    }

    return {
        dossier: {
            ...makeColonnesCommunesDossierPourSynchro(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS),
            ...(données_supplémentaires?.dossier || {}),
            date_dépôt: données_supplémentaires?.dossier?.date_dépôt ?? dossierDS.dateDepot
        },
        évènement_phase_dossier: données_supplémentaires?.évènement_phase_dossier,
        avis_expert: données_supplémentaires?.avis_expert,
        décision_administrative: données_supplémentaires?.décision_administrative,
        personnes_qui_suivent: données_supplémentaires?.personnes_qui_suivent,
    }
}


/**
 * Converti les "state" des "traitements" DS vers les phases Pitchou
 * Il n'existe pas de manière automatique de d'amener vers l'état "Vérification dossier" depuis DS
 * 
 * @param {Traitement['state']} DSTraitementState
 * @returns {import('../../scripts/types/API_Pitchou.ts').DossierPhase}
 */
function traitementPhaseToDossierPhase(DSTraitementState) {
    if (DSTraitementState === 'en_construction')
        return "Accompagnement amont"
    if (DSTraitementState === 'en_instruction')
        return "Instruction"
    if (DSTraitementState === 'accepte')
        return "Contrôle"
    if (DSTraitementState === 'sans_suite')
        return "Classé sans suite"
    if (DSTraitementState === 'refuse')
        return "Obligations terminées"

    throw `Traitement phase non reconnue: ${DSTraitementState}`
}

/**
 * 
 * @param {DossierDS88444['traitements']} traitements 
 * @param {Dossier['id']} [dossierId]
 */
function makeÉvènementsPhaseDossierFromTraitementsDS(traitements, dossierId) {
    /** @type {DossierPourInsert['évènement_phase_dossier']} */
    const évènementsPhaseDossier = [];

    for (const { dateTraitement, state, emailAgentTraitant, motivation } of traitements) {
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
 * @param {DossierDS88444} dossierDS 
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersAvisCSRPN_CNPN_Téléchargés
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersSaisinesCSRPN_CNPN_Téléchargés
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersAvisConformeMinistreTéléchargés
 * @param {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>}  pitchouKeyToAnnotationDS
 * @param {AvisExpert['dossier'] | null } idPitchouDuDossier // Si le dossier est à insérer et pas à updater, alors l'id du dossier n'existe pas encore et il est défini à null.
 * @returns {PartialBy<AvisExpertInitializer, 'dossier'>[]}
 */
function makeAvisExpertFromTraitementsDS(dossierDS, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, pitchouKeyToAnnotationDS, idPitchouDuDossier) {
    /** @type {PartialBy<AvisExpertInitializer, 'dossier'>[]} */
    let lignes_à_insérer = []

    /** @type {Map<string | undefined, any>} */
    const annotationById = new Map()
    for (const annotation of dossierDS.annotations) {
        annotationById.set(annotation.id, annotation)
    }

    const fichiersAvisCSRPN_CNPN = fichiersAvisCSRPN_CNPN_Téléchargés?.get(Number(dossierDS.number))
    const fichiersSaisinesCSRPN_CNPN = fichiersSaisinesCSRPN_CNPN_Téléchargés?.get(Number(dossierDS.number))
    const fichiersAvisConformeMinistre = fichiersAvisConformeMinistreTéléchargés?.get(Number(dossierDS.number))

    if (fichiersAvisCSRPN_CNPN && fichiersAvisCSRPN_CNPN.length >= 1 || fichiersSaisinesCSRPN_CNPN && fichiersSaisinesCSRPN_CNPN.length >= 1) {
        /** @type {"CSRPN" | "CNPN" | null} */
        let expert_cnpn_csrpn = null

        const champDateAvisCNPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN"))?.date
        const champDateAvisCSRPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CSRPN"))?.date
        const champDateSaisineCNPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN"))?.date
        const champDateSaisineCSRPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CSRPN"))?.date

        if (champDateAvisCNPN || champDateSaisineCNPN) {
            expert_cnpn_csrpn = "CNPN"
        } else if (champDateAvisCSRPN || champDateSaisineCSRPN) {
            expert_cnpn_csrpn = "CSRPN"
        }

        /**
         * On doit passer par un filter pour le champ Avis CSRPN/CNPN
         * car il existe trois champs avec ce label dans les Annotations Privées
         */
        const champs_avis_csrpn_cnpn = dossierDS.annotations.filter((annotation) => annotation.label === "Avis CSRPN/CNPN")
        assert(champs_avis_csrpn_cnpn.length === 3, `Le nombre de champs dans les Annotations Privées avec le label "Avis CSRPN/CNPN" est incorrect : ${champs_avis_csrpn_cnpn.length} au lieu de 3. `)
        const id_champ_avis_csrpn_cnpn_selection = champs_avis_csrpn_cnpn[1].id

        const avis_csrpn_cnpn = annotationById.get(id_champ_avis_csrpn_cnpn_selection)?.stringValue || ''
        const fichier_avis_csrpn_cnpn = fichiersAvisCSRPN_CNPN && fichiersAvisCSRPN_CNPN.length >= 1 ? fichiersAvisCSRPN_CNPN[0] : null
        const fichier_saisine_csrpn_cnpn = fichiersSaisinesCSRPN_CNPN && fichiersSaisinesCSRPN_CNPN.length >= 1 ? fichiersSaisinesCSRPN_CNPN[0] : null

        let date_avis_cnpn_csprn
        let date_saisine_cnpn_csrpn
        if (expert_cnpn_csrpn === "CNPN") {
            date_avis_cnpn_csprn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN"))?.date ?? undefined
            date_saisine_cnpn_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN"))?.date ?? undefined
        } else if (expert_cnpn_csrpn) {
            date_avis_cnpn_csprn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CSRPN"))?.date ?? undefined
            date_saisine_cnpn_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CSRPN"))?.date ?? undefined
        }
        /** @type {PartialBy<AvisExpertInitializer, 'dossier'>} */
        const ligne_cnpn_csrpn = { dossier: idPitchouDuDossier ?? undefined, avis: avis_csrpn_cnpn, date_avis: date_avis_cnpn_csprn, date_saisine: date_saisine_cnpn_csrpn, expert: expert_cnpn_csrpn, avis_fichier: fichier_avis_csrpn_cnpn, saisine_fichier: fichier_saisine_csrpn_cnpn }
        lignes_à_insérer.push(ligne_cnpn_csrpn)
    }

    if (fichiersAvisConformeMinistre && fichiersAvisConformeMinistre.length >= 1) {
        const date_avis_ministre = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis conforme Ministre"))?.date
        const fichier_avis_ministre = fichiersAvisConformeMinistre && fichiersAvisConformeMinistre.length >= 1 ? fichiersAvisConformeMinistre[0] : null

        /** @type {PartialBy<AvisExpertInitializer, 'dossier'>} */
        const ligne_ministre = {
            dossier: idPitchouDuDossier ?? undefined,
            date_avis: date_avis_ministre,
            expert: 'Ministre',
            avis: 'Conforme',
            avis_fichier: fichier_avis_ministre,
            saisine_fichier: null,
            date_saisine: null
        }

        lignes_à_insérer.push(ligne_ministre)
    }

    return lignes_à_insérer
}

/**
 * Synchronisation des décisions administratives
 * Les fichiers téléchargés correspondent à ceux qui n'avaient pas été téléchargés et donc sûrement à
 * une nouvelle décision administrative qui n'est pas encore en BDD
 * 
 * On utilise le dernier traitement du dossier pour déterminer le type de décision administrative (acceptation, refus)
 * 
 * @param {DossierDS88444} dossierDS 
 * @param {Map<DossierDS88444['number'], FichierId> | undefined} fichiersMotivationTéléchargés
 * @param {DCisionAdministrative['dossier'] | null } idPitchouDuDossier // Si le dossier est à insérer et pas à updater, alors l'id du dossier n'existe pas encore et il est défini à null.
 * @returns {PartialBy<DCisionAdministrativeInitializer, "dossier">[]}
 */
function makeDécisionAdministrativeFromTraitementDS(dossierDS, fichiersMotivationTéléchargés, idPitchouDuDossier) {
    /**@type { PartialBy<DCisionAdministrativeInitializer, "dossier">[] } */
    const décisionsAdministratives = []

    if (fichiersMotivationTéléchargés && fichiersMotivationTéléchargés.size >= 1) {
        const fichierMotivationId = fichiersMotivationTéléchargés.get(dossierDS.number)

        /** @type {TypeDécisionAdministrative} */
        let type = 'Autre décision';

        const traitements = dossierDS.traitements
        let dernierTraitement = traitements[0];
        for (const traitement of traitements) {
            if (isAfter(traitement.dateTraitement, dernierTraitement.dateTraitement)) {
                dernierTraitement = traitement
            }
        }
        if (dernierTraitement.state === 'accepte')
            type = 'Arrêté dérogation'
        if (dernierTraitement.state === 'refuse')
            type = 'Arrêté refus'

        décisionsAdministratives.push({
            dossier: idPitchouDuDossier ?? undefined,
            fichier: fichierMotivationId,
            type,
            date_signature: null, // pas de remplissage par défaut
            numéro: null,
            date_fin_obligations: null
        })
    }

    return décisionsAdministratives
}

/**
 * Récupère les données brutes des dossiers depuis Démarches Simplifiées
 * puis les transforme au format attendu par l'application
 * afin de permettre leur insertion ou mise à jour en base de données.
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<Dossier['number_demarches_simplifiées'], Dossier['id']>} numberDSDossiersDéjàExistantsEnBDD
 * @param {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToChampDS - Mapping des clés Pitchou vers les IDs de champs DS
 * @param {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToAnnotationDS - Mapping des clés Pitchou vers les IDs d'annotations DS
 * @param {Map<number, FichierId[]> | undefined} fichiersSaisinesCSRPN_CNPN_Téléchargés
 * @param {Map<number, FichierId[]> | undefined} fichiersAvisCSRPN_CNPN_Téléchargés
 * @param {Map<number, FichierId[]> | undefined} fichiersAvisConformeMinistreTéléchargés
 * @param {Map<number, FichierId> | undefined} fichiersMotivationTéléchargés
 * @returns {Promise<{ dossiersAInitialiserPourSynchro: DossierEntreprisesPersonneInitializersPourInsert[], dossiersAModifierPourSynchro: DossierEntreprisesPersonneInitializersPourUpdate[] }>} 
 */
export async function makeDossiersPourSynchronisation(dossiersDS, numberDSDossiersDéjàExistantsEnBDD, pitchouKeyToChampDS, pitchouKeyToAnnotationDS, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, fichiersMotivationTéléchargés) {
    const { dossiersDSAInitialiser, dossiersDSAModifier } = splitDossiersEnAInitialiserAModifier(dossiersDS, numberDSDossiersDéjàExistantsEnBDD)


    /** @type {Promise<DossierEntreprisesPersonneInitializersPourInsert>[]} */
    const dossiersAInitialiserPourSynchroP = dossiersDSAInitialiser.map((dossierDS) => {
        const champsDossierPourInitP = makeChampsDossierPourInitialisation(
            dossierDS,
            pitchouKeyToChampDS,
            pitchouKeyToAnnotationDS
        )

        const évènement_phase_dossier = makeÉvènementsPhaseDossierFromTraitementsDS(dossierDS.traitements)

        const avis_expert = makeAvisExpertFromTraitementsDS(dossierDS, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, pitchouKeyToAnnotationDS, null)

        const décision_administrative = makeDécisionAdministrativeFromTraitementDS(dossierDS, fichiersMotivationTéléchargés, null)

        return champsDossierPourInitP.then(champsDossierPourInit => ({
            dossier: {
                ...champsDossierPourInit.dossier,
                ...getDonnéesPersonnesEntreprises(dossierDS, pitchouKeyToChampDS)
            },
            // Les évènements phases retournées par makeÉvènementsPhaseDossierFromTraitementsDS 
            // ne concernent que les dossiers à mettre à jour (pas ceux créés)
            évènement_phase_dossier: champsDossierPourInit.évènement_phase_dossier ?? évènement_phase_dossier,
            avis_expert: [
                ...(champsDossierPourInit.avis_expert || []),
                ...avis_expert
            ],
            décision_administrative: [
                ...(champsDossierPourInit.décision_administrative || []),
                ...décision_administrative
            ],
            personnes_qui_suivent: champsDossierPourInit.personnes_qui_suivent
        }))
    })

    const dossiersAModifierPourSynchro = dossiersDSAModifier.map((dossierDS) => {
        const dossierId = numberDSDossiersDéjàExistantsEnBDD.get(String(dossierDS.number))

        if (!dossierId) {
            throw new Error(`dossier.id non trouvé pour dossier DS ${dossierDS.number} qui est en base de données`)
        }

        const dossierPartiel = makeColonnesCommunesDossierPourSynchro(
            dossierDS,
            pitchouKeyToChampDS,
            pitchouKeyToAnnotationDS
        )

        const évènement_phase_dossier = makeÉvènementsPhaseDossierFromTraitementsDS(dossierDS.traitements, dossierId)

        const avis_expert = makeAvisExpertFromTraitementsDS(dossierDS, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, pitchouKeyToAnnotationDS, dossierId)

        const décision_administrative = makeDécisionAdministrativeFromTraitementDS(dossierDS, fichiersMotivationTéléchargés, dossierId)

        return ({
            dossier: {
                ...dossierPartiel,
                ...getDonnéesPersonnesEntreprises(dossierDS, pitchouKeyToChampDS),
            },
            évènement_phase_dossier,
            avis_expert,
            décision_administrative,
        })
    })

    const dossiersAInitialiserPourSynchro = await Promise.all(dossiersAInitialiserPourSynchroP)

    return {
        dossiersAInitialiserPourSynchro,
        dossiersAModifierPourSynchro
    }
}
