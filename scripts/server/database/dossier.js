

/** @import {default as Dossier, DossierId} from '../../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../../types/database/public/Personne.ts' */
/** @import {default as Message} from '../../types/database/public/Message.ts' */
/** @import {default as ÉvènementPhaseDossier} from '../../types/database/public/ÉvènementPhaseDossier.ts' */
/** @import {default as DécisionAdministrative} from '../../types/database/public/DécisionAdministrative.ts' */
/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */
/** @import {default as Contrôle} from '../../types/database/public/Contrôle.ts' */
/** @import {default as CapDossier} from '../../types/database/public/CapDossier.ts' */
/** @import * as API_DS_SCHEMA from '../../types/démarches-simplifiées/apiSchema.js' */
/** @import {DossierPourInsert, DossierPourUpdate} from '../../types/démarches-simplifiées/DossierPourSynchronisation.ts' */
/** @import ArTePersonneSuitDossier from '../../types/database/public/ArêtePersonneSuitDossier.ts' */

import knex from 'knex';

import {directDatabaseConnection} from '../database.js'
import {getDécisionAdministratives, getDécisionsAdministratives} from './décision_administrative.js';
import {getPrescriptions} from './prescription.js';
import {getContrôles} from './controle.js';
import { normalisationEmail } from '../../commun/manipulationStrings.js';


//@ts-ignore
/** @import {DossierComplet, DossierRésumé, FrontEndDécisionAdministrative, FrontEndPrescription} from '../../types/API_Pitchou.d.ts' */
//@ts-ignore
/** @import {PickNonNullable} from '../../types/tools.d.ts' */


/**
 * Récupérer les id Pitchou à partir des id DS (pas les numéro)
 *
 * PPP : c'est un peu bizarre d'utiliser les ids DS, on pourrait utiliser les numéros
 *
 * @param {Dossier['id_demarches_simplifiées'][]} DS_ids
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise< PickNonNullable<Dossier, 'id' | 'id_demarches_simplifiées' | 'number_demarches_simplifiées'>[] >}
 */
export function getDossierIdsFromDS_Ids(DS_ids, databaseConnection = directDatabaseConnection){
    return databaseConnection('dossier')
        .select(['id', 'id_demarches_simplifiées', 'number_demarches_simplifiées'])
        .whereIn('id_demarches_simplifiées', DS_ids)
}


/**
 * @param {Map<Dossier['id'], API_DS_SCHEMA.Message[]>} idToMessages
 * @param {import('knex').Knex.Transaction | import('knex').Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function dumpDossierMessages(idToMessages, databaseConnection = directDatabaseConnection) {
    /** @type {Partial<Message>[]} */
    const messages = [];

    for(const [dossierId, apiMessages] of idToMessages){
        for(const {id, body, createdAt, email} of apiMessages){
            messages.push({
                contenu: body,
                date: new Date(createdAt),
                email_expéditeur: email,
                id_démarches_simplifiées: id,
                dossier: dossierId
            })
        }
    };

    return databaseConnection('message')
        .insert(messages)
        .onConflict('id_démarches_simplifiées').merge()
}



/**
 * Cette fonction est sensible
 * Appeler dossiersAccessibleViaCap avant
 *
 * @param {Dossier['id']} dossierId
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Partial<Message>[] | null>}
 */
export async function getDossierMessages(dossierId, databaseConnection = directDatabaseConnection){
    return databaseConnection('message')
        .select(['contenu', 'date', 'email_expéditeur'])
        .where({"dossier": dossierId})
}


/** @type {(keyof Pick<Dossier, "nom" | 'ddep_nécessaire'>)[]} */
const varcharKeys = [
    'nom',
    'ddep_nécessaire'
]


/**
 *
 * @param {DossierPourInsert[]} dossiersPourInsert
 * @param {DossierPourUpdate[]} dossiersPourUpdate
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
export async function dumpDossiers(dossiersPourInsert, dossiersPourUpdate, databaseConnection = directDatabaseConnection){

    for(const {dossier: d} of [...dossiersPourInsert, ...dossiersPourUpdate]){
        for(const k of varcharKeys){
            if(typeof d[k] === 'string' && d[k].length >= 255){
                console.warn('Attontion !! Dossier DS numéro', d.number_demarches_simplifiées, 'key', k, '.length >= 255')
                console.warn('Valeur:', d[k])

                console.warn(`La valeur est coupée pour qu'elle rentre en base de données`)
                // @ts-ignore
                d[k] = d[k].slice(0, 255)
            }
        }
    }

    /**@type {knex.Knex.QueryBuilder<any, any>[]} */
    let updatePromises = []

    /** @type {ArTePersonneSuitDossier[]} */
    const arêtePersonneSuitDossierDossier = []

    if (dossiersPourUpdate.length>=1) {
        updatePromises = dossiersPourUpdate.map(({dossier: dossierAModifier}) => {
            return databaseConnection('dossier')
                .where('number_demarches_simplifiées', dossierAModifier.number_demarches_simplifiées)
                .update(dossierAModifier)
                .returning(['id', 'number_demarches_simplifiées', 'id_demarches_simplifiées'])
        })
    }

    /** @type {Promise<any>} */
    let synchroniserPersonnesEtRelationsSuiviPourDossiersInsérésP = Promise.resolve([])

    if (dossiersPourInsert.length >= 1) {

        /**@type { {id: DossierId}[]} */
        let insertedDossierIds = await databaseConnection('dossier')
                                    .insert(dossiersPourInsert.map(tables => tables.dossier))
                                    .returning(['id'])

        const toutesLesPersonnesQuiSuivent = await synchroniserEtRetournerPersonnesPourDossiersInsérer(
                dossiersPourInsert,
                databaseConnection
            )

        if (toutesLesPersonnesQuiSuivent.length >= 1) {
            insertedDossierIds.forEach((dossierInséréId, index) => {
            const {personnes_qui_suivent, évènement_phase_dossier} = dossiersPourInsert[index]
            const emailsQuiSuivent = new Set(personnes_qui_suivent?.map(p => p.email))

            //Attention, ici il y a un risque de problèmes de performance avec le filter
            const personnesQuiSuiventCeDossier = toutesLesPersonnesQuiSuivent.filter(p => p.email && emailsQuiSuivent.has(p.email))

            personnesQuiSuiventCeDossier.forEach(personne => {arêtePersonneSuitDossierDossier.push({ dossier: dossierInséréId.id, personne: personne.id }) })


            if(personnesQuiSuiventCeDossier.length >= 1){
                évènement_phase_dossier.forEach(ev => {
                    if (!ev.cause_personne) {
                        // Dans le front-end, on souhaite afficher les évènements phases avec une cause_personne non nulle.
                        ev.cause_personne = personnesQuiSuiventCeDossier[0].id
                    }
                })
            }
            })
        }

        // Rajouter nouveaux les Dossier['id'] aux données qui en ont besoin
        insertedDossierIds.forEach((dossierInséréId, index) => {
                // suppose que postgres retourne les id dans le même ordre que le tableau passé à `.insert`
            const {évènement_phase_dossier, avis_expert, décision_administrative} = dossiersPourInsert[index]

            if(Array.isArray(évènement_phase_dossier) && évènement_phase_dossier.length >= 1){
                évènement_phase_dossier.forEach(ev => ev.dossier = dossierInséréId.id)
            }
            if (Array.isArray(avis_expert) && avis_expert.length >=1){
                avis_expert.forEach(ae => ae.dossier = dossierInséréId.id)
            }
            if (Array.isArray(décision_administrative) && décision_administrative.length >= 1) {
                décision_administrative.forEach(da => da.dossier = dossierInséréId.id)
            }
            })
    }


    const tousLesDossiers = [...dossiersPourUpdate, ...dossiersPourInsert]

    const évènementsPhaseDossier = tousLesDossiers
        .map(tables => tables.évènement_phase_dossier)
        .filter(x => x !== undefined)
        .flat()

    const avisExpertDossier = tousLesDossiers
        .map(tables => tables.avis_expert)
        .filter(x => x !== undefined)
        .flat()

   const décisionAdministrativeDossier = tousLesDossiers
        .map(tables => tables.décision_administrative)
        .filter(x => x !== undefined)
        .flat()


    const databaseOperations = [
        évènementsPhaseDossier.length > 0
            ? databaseConnection('évènement_phase_dossier')
                .insert(évènementsPhaseDossier)
                .onConflict(['dossier', 'phase', 'horodatage'])
                .merge()
            : Promise.resolve([]),

        avisExpertDossier.length > 0
            ? databaseConnection('avis_expert').insert(avisExpertDossier)
            : Promise.resolve([]),

        décisionAdministrativeDossier.length > 0
            ? databaseConnection('décision_administrative').insert(décisionAdministrativeDossier)
            : Promise.resolve([]),

        arêtePersonneSuitDossierDossier.length > 0
            ? databaseConnection('arête_personne_suit_dossier')
                    .insert(arêtePersonneSuitDossierDossier)
                    .onConflict(['personne', 'dossier'])
                    .ignore()

            : Promise.resolve([]),

        synchroniserPersonnesEtRelationsSuiviPourDossiersInsérésP,

        ...updatePromises
    ]

    return Promise.all(databaseOperations)
}

/**
 * @param {any} dossierDS
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
export async function synchroniserDossierDansGroupeInstructeur(dossierDS, databaseConnection = directDatabaseConnection){
    const dossierNumberDSToIdP = databaseConnection('dossier')
    .select(['id', 'number_demarches_simplifiées'])
    .whereIn('number_demarches_simplifiées', dossierDS.map((/** @type {{ number: string; }} */ d) => d.number))
    .then(dossiers => {
        const dossierNumberDSToId = new Map()
        for(const {id, number_demarches_simplifiées} of dossiers){
            dossierNumberDSToId.set(number_demarches_simplifiées, id)
        }
        return dossierNumberDSToId;
    });

    const groupeInstructeursLabelToIdP = databaseConnection('groupe_instructeurs')
    .select(['id', 'nom'])
    .then(groupesInstructeurs => {
        const groupeInstructeursLabelToId = new Map()
        for(const {id, nom} of groupesInstructeurs){
            groupeInstructeursLabelToId.set(nom, id)
        }
        return groupeInstructeursLabelToId;
    });

    const dossierNumberDSToId = await dossierNumberDSToIdP
    const groupeInstructeursLabelToId = await groupeInstructeursLabelToIdP

    // @ts-ignore
    const arêtesGroupeTnstructeurs_Dossier = dossierDS.map(({number, groupeInstructeur: {label}}) => {
        const dossierId = dossierNumberDSToId.get(String(number))
        const groupe_instructeursId =  groupeInstructeursLabelToId.get(label)

        if(!groupe_instructeursId){
            throw new Error(`groupe_instructeursId manquant pour groupe ${label}`)
        }

        return {dossier: dossierId, groupe_instructeurs: groupe_instructeursId}
    })

    return databaseConnection('arête_groupe_instructeurs__dossier')
        .insert(arêtesGroupeTnstructeurs_Dossier)
        .onConflict('dossier')
        .merge(['groupe_instructeurs'])

}

/** @type {(keyof DossierComplet)[]} */
const colonnesDossierComplet = [
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "dossier.id as id",
    //"id_demarches_simplifiées",
    "number_demarches_simplifiées",
    "date_dépôt",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "dossier.nom as nom",
    "description",

    'date_début_intervention',
    'date_fin_intervention',
    'durée_intervention',

    'justification_absence_autre_solution_satisfaisante',
    'motif_dérogation',
    'justification_motif_dérogation',

    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "fichier_espèces_impactées.id as espèces_impactées_id",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "fichier_espèces_impactées.contenu as espèces_impactées_contenu",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "fichier_espèces_impactées.nom as espèces_impactées_nom",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "fichier_espèces_impactées.media_type as espèces_impactées_media_type",
    "rattaché_au_régime_ae",
    "activité_principale",

    // localisation
    "départements",
    "communes",
    "régions",

    // prochaine action attendue
    "prochaine_action_attendue_par",

    // déposant
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "déposant.nom as déposant_nom",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "déposant.prénoms as déposant_prénoms",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "déposant.email as déposant_email",

    // demandeur_personne_physique
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "demandeur_personne_physique.email as demandeur_personne_physique_email",

    // demandeur_personne_morale
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",
    //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
    "demandeur_personne_morale.adresse as demandeur_personne_morale_adresse",

    // annotations privées
    "ddep_nécessaire",

    "scientifique_type_demande",
    "scientifique_bilan_antérieur",
    "scientifique_finalité_demande",
    "scientifique_description_protocole_suivi",
    "scientifique_mode_capture",
    "scientifique_modalités_source_lumineuses",
    'scientifique_modalités_marquage',
    'scientifique_modalités_transport',
    'scientifique_périmètre_intervention',
    'scientifique_intervenants',
    'scientifique_précisions_autres_intervenants',

    "enjeu_écologique",
    "enjeu_politique",
    "commentaire_libre",
    "historique_identifiant_demande_onagre",

    'date_consultation_public',

    "mesures_erc_prévues",

    "nombre_nids_compensés_dossier_oiseau_simple",
    "nombre_nids_détruits_dossier_oiseau_simple",

    "type",
/*
    "historique_date_envoi_dernière_contribution"
*/

]


/**
 *
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<DossierComplet[]>}
 */
export function listAllDossiersComplets(databaseConnection = directDatabaseConnection) {
    return databaseConnection('dossier')
        .select(colonnesDossierComplet)
        .leftJoin('personne as déposant', {'déposant.id': 'dossier.déposant'})
        .leftJoin('personne as demandeur_personne_physique', {'demandeur_personne_physique.id': 'dossier.demandeur_personne_physique'})
        .leftJoin('entreprise as demandeur_personne_morale', {'demandeur_personne_morale.siret': 'dossier.demandeur_personne_morale'})
        .leftJoin('fichier as fichier_espèces_impactées', {'fichier_espèces_impactées.id': 'dossier.espèces_impactées'})
        .then(dossiers => {
            for(const dossier of dossiers){
                const id_fichier_espèces_impactées = dossier.espèces_impactées_id
                if(id_fichier_espèces_impactées){
                    dossier.url_fichier_espèces_impactées = `/especes-impactees/${id_fichier_espèces_impactées}`
                    // s'il y a un fichier, ignorer le champ contenant un lien
                    delete dossier.espèces_protégées_concernées
                }

            }
            return dossiers
        })
}



/**
 * @param {DossierComplet['id']} dossierId
 * @param {CapDossier['cap']} cap
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<DossierComplet | undefined>}
 */
export async function getDossierComplet(dossierId, cap, databaseConnection = directDatabaseConnection){
    /** @type {knex.Knex.Transaction} */
    let transaction;

    if(databaseConnection.isTransaction){
        //@ts-expect-error Knex est mal typé et ne comprend pas que databaseConnection est de type Knex.Transaction
        transaction = databaseConnection
    }
    else{
        transaction = await databaseConnection.transaction({ readOnly: true })
    }

    const accessibleDossierId = await dossiersAccessibleViaCap(dossierId, cap, transaction)

    if(!accessibleDossierId.has(dossierId)){
        if(!databaseConnection.isTransaction){
            // transaction créée à la main, la libérer avant de throw
            await transaction.commit()
        }
        throw new TypeError(`Le dossier ${dossierId} n'est pas accessible via la cap ${cap}`)
    }

    /** @type {Promise<DossierComplet & {espèces_impactées_contenu?: Buffer | null, espèces_impactées_media_type?: string, espèces_impactées_nom?: string, demandeur_personne_morale_adresse?: string}>} */
    const dossierP = transaction('dossier')
        .select(colonnesDossierComplet)
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'dossier.id'})
        .join('arête_cap_dossier__groupe_instructeurs', {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'})
        .leftJoin('personne as déposant', {'déposant.id': 'dossier.déposant'})
        .leftJoin('personne as demandeur_personne_physique', {'demandeur_personne_physique.id': 'dossier.demandeur_personne_physique'})
        .leftJoin('entreprise as demandeur_personne_morale', {'demandeur_personne_morale.siret': 'dossier.demandeur_personne_morale'})
        .leftJoin('fichier as fichier_espèces_impactées', {'fichier_espèces_impactées.id': 'dossier.espèces_impactées'})
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap})
        .andWhere({"dossier.id": dossierId})
        .first()

    /** @type {Promise<ÉvènementPhaseDossier[]>} */
    const évènementsPhaseDossierP = getÉvènementsPhaseDossier(dossierId, transaction)
    /** @type {Promise<DécisionAdministrative[]>} */

    const décisionsAdministrativesP = getDécisionAdministratives(dossierId, transaction)
    const decisionIds = (await décisionsAdministrativesP).map(d => d.id)

    /** @type {Promise<Prescription[]>} */
    const prescriptionsP = getPrescriptions(decisionIds, transaction)
    const prescriptionIds = (await prescriptionsP).map(d => d.id)

    /** @type {Promise<Contrôle[]>} */
    const contrôlesP = getContrôles(prescriptionIds, transaction)

    if(!databaseConnection.isTransaction){
        // transaction locale à cette fonction
        // nous la refermons donc manuellement
        Promise.all([dossierP, évènementsPhaseDossierP, décisionsAdministrativesP, prescriptionsP, contrôlesP])
            .then(transaction.commit).catch(transaction.rollback)
    }

    return Promise.all([dossierP, évènementsPhaseDossierP, décisionsAdministrativesP, prescriptionsP, contrôlesP])
        .then(([dossier, évènementsPhaseDossier, décisionsAdministratives, prescriptions, contrôles]) => {
            dossier.demandeur_adresse = dossier.demandeur_personne_morale_adresse || ''
            delete dossier.demandeur_personne_morale_adresse;

            dossier.évènementsPhase = évènementsPhaseDossier

            if(dossier.espèces_impactées_contenu && dossier.espèces_impactées_media_type && dossier.espèces_impactées_nom){
                dossier.espècesImpactées = {
                    contenu: dossier.espèces_impactées_contenu,
                    media_type: dossier.espèces_impactées_media_type,
                    nom: dossier.espèces_impactées_nom,
                }

                delete dossier.espèces_impactées_contenu
                delete dossier.espèces_impactées_media_type
                delete dossier.espèces_impactées_nom
            }

            /** @type {Map<Prescription['id'], Contrôle[]>} */
            const contrôlesParPrescriptionId = new Map()
            for(const c of contrôles){
                const id = c.prescription
                const contrôlesPourCetId = contrôlesParPrescriptionId.get(id) || []
                contrôlesPourCetId.push(c)
                contrôlesParPrescriptionId.set(id, contrôlesPourCetId)
            }


            /** @type {Map<DécisionAdministrative['id'], FrontEndPrescription[]>} */
            const prescriptionsParDécisionId = new Map()
            for(const p of prescriptions){
                const contrôles = contrôlesParPrescriptionId.get(p.id)
                // @ts-ignore p devient un FrontEndPrescription
                p.contrôles = contrôles

                const id = p.décision_administrative
                const prescrPourCetId = prescriptionsParDécisionId.get(id) || []

                // @ts-ignore p est devenu un FrontEndPrescription
                prescrPourCetId.push(p)
                prescriptionsParDécisionId.set(id, prescrPourCetId)
            }


            if(décisionsAdministratives.length >= 1){
                dossier.décisionsAdministratives = décisionsAdministratives.map(
                    ({
                        id, numéro, type, date_signature, date_fin_obligations,
                        fichier, dossier
                    }) => ({
                        id, numéro, type, date_signature, date_fin_obligations,
                        prescriptions: prescriptionsParDécisionId.get(id),
                        fichier_url: fichier ? `/decision-administrative/fichier/${fichier}`: undefined, dossier
                    })
                )
            }

            return dossier
        })

}


/** @type {(keyof DossierRésumé)[]} */
const colonnesDossierRésumé = [
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "dossier.id as id",
    //"id_demarches_simplifiées",
    "number_demarches_simplifiées",
    "date_dépôt",
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "dossier.nom as nom",
    "rattaché_au_régime_ae",
    "activité_principale",

    // localisation
    "départements",
    "communes",
    "régions",

    // prochaine action attendue
    "prochaine_action_attendue_par",

    // déposant
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "déposant.nom as déposant_nom",
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "déposant.prénoms as déposant_prénoms",

    // demandeur_personne_physique
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",

    // demandeur_personne_morale
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
    //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
    "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",

    // annotations privées
    "enjeu_écologique",
    "enjeu_politique",

    "commentaire_libre",

    "historique_identifiant_demande_onagre",

]


/**
 * @param {CapDossier['cap']} cap
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<DossierRésumé[]>}
 */
export async function getDossiersRésumésByCap(cap, databaseConnection = directDatabaseConnection){

    /** @type {knex.Knex.Transaction} */
    let transaction;

    if(databaseConnection.isTransaction){
        //@ts-expect-error Knex est mal typé et ne comprend pas que databaseConnection est de type Knex.Transaction
        transaction = databaseConnection
    }
    else{
        transaction = await databaseConnection.transaction({ readOnly: true })
    }

    /** @type {Promise<DossierRésumé[]>} */
    const dossiersP = transaction('dossier')
        .select(colonnesDossierRésumé)
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'dossier.id'})
        .join(
            'arête_cap_dossier__groupe_instructeurs',
            {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'}
        )
        .leftJoin('personne as déposant', {'déposant.id': 'dossier.déposant'})
        .leftJoin('personne as demandeur_personne_physique', {'demandeur_personne_physique.id': 'dossier.demandeur_personne_physique'})
        .leftJoin('entreprise as demandeur_personne_morale', {'demandeur_personne_morale.siret': 'dossier.demandeur_personne_morale'})
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap})

    const évènementsPhaseDossierP = getDerniersÉvènementsPhaseDossiers(cap, transaction)

    const décisionsAdministrativesP = getDécisionsAdministratives(cap, transaction)

    const result = Promise.all([dossiersP, évènementsPhaseDossierP, décisionsAdministrativesP])
    .then(([dossiers, évènementsPhaseDossier,décisionsAdministratives]) => {
        /** @type {Map<Dossier['id'], ÉvènementPhaseDossier>} */
        const évènementsPhaseDossierById = new Map()

        for(const évènementPhaseDossier of évènementsPhaseDossier){
            évènementsPhaseDossierById.set(évènementPhaseDossier.dossier, évènementPhaseDossier)
        }

        for(const dossier of dossiers){
            const évènementPhaseDossier = évènementsPhaseDossierById.get(dossier.id)

            if(évènementPhaseDossier){
                dossier.phase = évènementPhaseDossier.phase
                dossier.date_début_phase = évènementPhaseDossier.horodatage
            }
            else{
                // dépôt du dossier
                dossier.phase = 'Accompagnement amont'
                dossier.date_début_phase = dossier.date_dépôt
            }
        }

        /** @type {Map<Dossier['id'], FrontEndDécisionAdministrative[]>} */
        const décisionsAdministrativesById = new Map()
        for (const décisionAdministrative of décisionsAdministratives){
            const décisionsAdministrativesPourCetId = décisionsAdministrativesById.get(décisionAdministrative.dossier) || []
            décisionsAdministrativesPourCetId.push(décisionAdministrative)
            décisionsAdministrativesById.set(décisionAdministrative.dossier, décisionsAdministrativesPourCetId )
        }

        for (const dossier of dossiers){
            const décisionAdministrative = décisionsAdministrativesById.get(dossier.id)

            if (décisionAdministrative) {
                dossier.décisionsAdministratives = décisionAdministrative
            }
        }

        return dossiers
    })

    if(!databaseConnection.isTransaction){
        // transaction locale à cette fonction
        // nous la refermons donc manuellement
        Promise.all([dossiersP, évènementsPhaseDossierP])
            .then(transaction.commit).catch(transaction.rollback)
    }

    return result

}

/**
 * retourne le sous-ensemble de dossierIds accessibles via la cap
 *
 * @param {Dossier['id'] | Dossier['id'][]} dossierIds
 * @param {CapDossier['cap']} cap
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Set<Dossier['id']>>}
 */
export async function dossiersAccessibleViaCap(dossierIds, cap, databaseConnection = directDatabaseConnection){
    if(!Array.isArray(dossierIds))
        dossierIds = [dossierIds]

    const ret = databaseConnection('arête_cap_dossier__groupe_instructeurs')
        .select(['dossier.id as id'])
        .leftJoin(
            'arête_groupe_instructeurs__dossier',
            {'arête_groupe_instructeurs__dossier.groupe_instructeurs': 'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs'}
        )
        .leftJoin(
            'dossier',
            {'dossier.id': 'arête_groupe_instructeurs__dossier.dossier'}
        )
        .whereIn('dossier.id', dossierIds)
        .andWhere({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap})
        .then(dossiers => new Set(dossiers.map(d => d.id)))

    // @ts-ignore
    return ret;
}


/**
 * Récupère uniquement la phase actuelle (la plus récente) pour chaque dossier
 * La requête utilise une astuce à coup de distinctOn (spécifique à Postgresql) pour y arriver
 *
 * @param {CapDossier['cap']} cap_dossier
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<ÉvènementPhaseDossier[]>}
 */
export async function getDerniersÉvènementsPhaseDossiers(cap_dossier, databaseConnection = directDatabaseConnection){

    return databaseConnection('évènement_phase_dossier')
        .select(['évènement_phase_dossier.dossier as dossier', 'phase', 'horodatage'])
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'évènement_phase_dossier.dossier'})
        .join(
            'arête_cap_dossier__groupe_instructeurs',
            {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'}
        )
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier})
        .distinctOn('dossier')
        .andWhere(function () {
            // DS créé des mauvais "traitement" qui ne sont pas des changements de phase
            // On peut les détecter avec 'DS_emailAgentTraitant IS NULL'
            // Si un évènement_phase_dossier n'a ni de 'cause_personne' ni de 'DS_emailAgentTraitant',
            // on ne veut pas le refléter côté interface
            this.whereNotNull('cause_personne').orWhereNotNull('DS_emailAgentTraitant');
        })
        .orderBy([
            { column: 'dossier', order: 'asc' },
            { column: 'horodatage', order: 'desc' }
        ]);
}


/**
 * @param {CapDossier['cap']} cap_dossier
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<ÉvènementPhaseDossier[]>}
 */
export async function getÉvènementsPhaseDossiers(cap_dossier, databaseConnection = directDatabaseConnection){

    return databaseConnection('évènement_phase_dossier')
        .select(['évènement_phase_dossier.dossier as dossier', 'phase', 'horodatage'])
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'évènement_phase_dossier.dossier'})
        .join(
            'arête_cap_dossier__groupe_instructeurs',
            {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'}
        )
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier})
        .andWhere(function () {
            // DS créé des mauvais "traitement" qui ne sont pas des changements de phase
            // On peut les détecter avec 'DS_emailAgentTraitant IS NULL'
            // Si un évènement_phase_dossier n'a ni de 'cause_personne' ni de 'DS_emailAgentTraitant',
            // on ne veut pas le refléter côté interface
            this.whereNotNull('cause_personne').orWhereNotNull('DS_emailAgentTraitant');
        })
}

/**
 * @param {Dossier['id']} idDossier
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<ÉvènementPhaseDossier[]>}
 */
async function getÉvènementsPhaseDossier(idDossier, databaseConnection = directDatabaseConnection){

    return databaseConnection('évènement_phase_dossier')
        .select('*')
        .where({'dossier': idDossier})
        .andWhere(function () {
            // DS créé des mauvais "traitement" qui ne sont pas des changements de phase
            // On peut les détecter avec 'DS_emailAgentTraitant IS NULL'
            // Si un évènement_phase_dossier n'a ni de 'cause_personne' ni de 'DS_emailAgentTraitant',
            // on ne veut pas le refléter côté interface
            this.whereNotNull('cause_personne').orWhereNotNull('DS_emailAgentTraitant');
        })
        .orderBy('horodatage', 'desc');

}


/**
 *
 * @param {number[]} numbers
 * @returns
 */
export function deleteDossierByDSNumber(numbers){
    return directDatabaseConnection('dossier')
        .whereIn('number_demarches_simplifiées', numbers)
        .delete()
}

/**
 *
 * @param {Dossier['id']} id
 * @param {Partial<Dossier & {évènementsPhase: ÉvènementPhaseDossier[]}>} dossierParams
 * @param {Personne['id']} causePersonne
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function updateDossier(id, dossierParams, causePersonne, databaseConnection = directDatabaseConnection) {
    let phaseAjoutée = Promise.resolve()

    if(dossierParams.évènementsPhase){
        for(const ev of dossierParams.évènementsPhase){
            ev.cause_personne = causePersonne
        }

        phaseAjoutée = databaseConnection('évènement_phase_dossier')
            .insert(dossierParams.évènementsPhase)

        delete dossierParams.évènementsPhase
    }

    let dossierÀJour = Promise.resolve()

    if(Object.keys(dossierParams).length >= 1){
        dossierÀJour = databaseConnection('dossier')
            .where({ id })
            .update(dossierParams)
    }

    return Promise.all([phaseAjoutée, dossierÀJour])
}

/**
 * Synchronise et retourne les personnes des dossiers à insérer.
 *
 * @param {DossierPourInsert[]} dossiersPourInsert
 * @param {knex.Knex.Transaction | knex.Knex} databaseConnection
 */
async function synchroniserEtRetournerPersonnesPourDossiersInsérer(dossiersPourInsert, databaseConnection){
    /** @type {Personne[]} */
    let personnes = []

    /** @type {Pick<Personne,"email" | "nom" |"prénoms">[]} */
    //@ts-ignore
    const personnesQuiSuiventDossiers = dossiersPourInsert
        .flatMap(dossier => dossier.personnes_qui_suivent)
        .filter(x => x != null)
        // On ne sélectionne que les propriétés que l'on veut garder (pas code_accès)
        .map(({email, nom, prénoms}) => ({ email: email ? normalisationEmail(email) : null, nom, prénoms}))

    if (personnesQuiSuiventDossiers.length >= 1) {
        await databaseConnection('personne')
            .insert(personnesQuiSuiventDossiers)
            .onConflict(['email'])
            .ignore();

        const emails = personnesQuiSuiventDossiers
            .map(p => p?.email)
            .filter(x => x != null)

        personnes = await databaseConnection('personne')
            .select('id', 'email')
            .whereIn('email', emails)

    }
    return personnes

}
