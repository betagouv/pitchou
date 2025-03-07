import knex from 'knex';

import {directDatabaseConnection} from '../database.js'
import { getDerniersÉvènementsPhaseDossiers, getÉvènementsPhaseDossier } from './évènement_phase_dossier.js';

//@ts-ignore
/** @import {DossierComplet, DossierPhase, DossierRésumé} from '../../types/API_Pitchou.d.ts' */
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {default as Personne} from '../../types/database/public/Personne.ts' */
//@ts-ignore
/** @import {default as Message} from '../../types/database/public/Message.ts' */
//@ts-ignore
/** @import {default as ÉvènementPhaseDossier} from '../../types/database/public/ÉvènementPhaseDossier.ts' */
//@ts-ignore
/** @import {default as CapDossier} from '../../types/database/public/CapDossier.ts' */
//@ts-ignore
/** @import {default as EspècesImpactées} from '../../types/database/public/EspècesImpactées.ts' */
//@ts-ignore
/** @import * as API_DS_SCHEMA from '../../types/démarches-simplifiées/apiSchema.js' */
//@ts-ignore
/** @import {PickNonNullable} from '../../types/tools.d.ts' */


/**
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


/** @type {(keyof Dossier)[]} */
const varcharKeys = [
    'statut',
    'nom',
    'historique_nom_porteur',
    'historique_localisation',
    'ddep_nécessaire',
    'historique_décision',
    'historique_référence_arrêté_préfectoral',
    'historique_référence_arrêté_ministériel',
]


/**
 *
 * @param {Partial<Dossier>[]} dossiers
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function dumpDossiers(dossiers, databaseConnection = directDatabaseConnection){
    for(const d of dossiers){
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

    let colonnesÀfusionner = new Set();

    for(const d of dossiers){
        colonnesÀfusionner = new Set([...colonnesÀfusionner, ...Object.keys(d)])
    }

    const colonnesÀNePasFusionner = ['id', 'phase', 'prochaine_action_attendue_par']
    for(const colonne of colonnesÀNePasFusionner){
        colonnesÀfusionner.delete(colonne)
    }

    //console.log('colonnesÀfusionner', colonnesÀfusionner)

    return databaseConnection('dossier')
        .insert(dossiers)
        .returning(['id', 'number_demarches_simplifiées', 'id_demarches_simplifiées'])
        .onConflict('number_demarches_simplifiées')
        .merge([...colonnesÀfusionner])
}

/**
 * @param {any} dossierDS 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
export async function synchroniserSuiviDossier(dossierDS, databaseConnection = directDatabaseConnection){
    const dossierNumberDSToIdP = databaseConnection('dossier')
        .select(['id', 'number_demarches_simplifiées'])
        .whereIn('number_demarches_simplifiées', dossierDS.map((/** @type {{ number: string; }} */ d) => d.number))
        .then(dossiers => {
            const dossierNumberDSToId = new Map()
            for(const {id, number_demarches_simplifiées} of dossiers){
                dossierNumberDSToId.set(number_demarches_simplifiées, id)
            }
            return dossierNumberDSToId;
        })


    const emailsSuiveurs = new Set()

    for(const {instructeurs} of dossierDS){
        for(const {email} of instructeurs){
            emailsSuiveurs.add(email)
        }
    }

    const suiveurEmailToIdP = databaseConnection('personne')
        .select(['id', 'email'])
        .whereIn('email', [...emailsSuiveurs])
        .then(suiveurs => {
            const suiveurEmailToId = new Map()
            for(const {id, email} of suiveurs){
                suiveurEmailToId.set(email, id)
            }
            return suiveurEmailToId;
        })

    const dossierNumberDSToId = await dossierNumberDSToIdP

    // supprimer les entrées dans arête_personne_suit_dossier pour ces dossierIds 
    // (notamment au cas où une personne a arrêté de suivre un dossier)
    await databaseConnection('arête_personne_suit_dossier')
        .delete()
        .whereIn('dossier', [...dossierNumberDSToId.values()])

    const suiveurEmailToId = await suiveurEmailToIdP

    const arêtesPersonneSuitDossier = []

    for(const {number, instructeurs} of dossierDS){
        const dossier = dossierNumberDSToId.get(String(number));

        for(const {email} of instructeurs){
            const personne = suiveurEmailToId.get(email)
            arêtesPersonneSuitDossier.push({dossier, personne})
        }
    }

    try {    
        await databaseConnection('arête_personne_suit_dossier')
            .insert(arêtesPersonneSuitDossier)
    } catch (_e) {
        return Promise.resolve()
    }
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

        return {dossier: dossierId, groupe_instructeurs: groupe_instructeursId}
    })
    
    return databaseConnection('arête_groupe_instructeurs__dossier')
        .insert(arêtesGroupeTnstructeurs_Dossier)
        .onConflict('dossier')
        .merge(['groupe_instructeurs'])

}

/** @type {(keyof DossierComplet)[]} */
const colonnesDossierComplet = [
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "dossier.id as id",
    //"id_demarches_simplifiées",
    "number_demarches_simplifiées",
    "statut",
    "date_dépôt",
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "dossier.nom as nom",
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "espèces_impactées.contenu as espèces_impactées_contenu",
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "espèces_impactées.nom as espèces_impactées_nom",
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "espèces_impactées.media_type as espèces_impactées_media_type",
    "rattaché_au_régime_ae",
    "activité_principale",

    // localisation
    "départements",
    "communes",
    "régions",

    // prochaine action attendue
    "prochaine_action_attendue_par",

    // déposant
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "déposant.nom as déposant_nom",
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "déposant.prénoms as déposant_prénoms",

    // demandeur_personne_physique
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",

    // demandeur_personne_morale
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
    //@ts-expect-error pas exacement une keyof DossierComplet, mais quand même
    "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",

    // annotations privées
    /*
    "historique_nom_porteur",
    "historique_localisation",
    */
    "ddep_nécessaire",

    "enjeu_écologique",
    "enjeu_politique",
    "commentaire_enjeu",
    "historique_identifiant_demande_onagre",

    "historique_date_réception_ddep",
/*    
    "historique_date_envoi_dernière_contribution",
    "historique_date_saisine_csrpn",
    "historique_date_saisine_cnpn",
    "date_avis_csrpn",
    "date_avis_cnpn",
    "avis_csrpn_cnpn",
    "date_consultation_public",
*/
    "historique_décision",
    "historique_date_signature_arrêté_préfectoral",
    "historique_référence_arrêté_préfectoral",
    "historique_date_signature_arrêté_ministériel",
    "historique_référence_arrêté_ministériel"

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
        .leftJoin('espèces_impactées', {'espèces_impactées.dossier': 'dossier.id'})
        .then(dossiers => {
            for(const dossier of dossiers){
                const id_fichier_espèces_impactées = dossier.url_fichier_espèces_impactées
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

    /** @type {Promise<DossierComplet & {espèces_impactées_contenu?: Buffer | null, espèces_impactées_media_type?: string, espèces_impactées_nom?: string}>} */
    const dossierP = transaction('dossier')
        .select(colonnesDossierComplet)
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'dossier.id'})
        .join('arête_cap_dossier__groupe_instructeurs', {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'})
        .leftJoin('personne as déposant', {'déposant.id': 'dossier.déposant'})
        .leftJoin('personne as demandeur_personne_physique', {'demandeur_personne_physique.id': 'dossier.demandeur_personne_physique'})
        .leftJoin('entreprise as demandeur_personne_morale', {'demandeur_personne_morale.siret': 'dossier.demandeur_personne_morale'})
        .leftJoin('espèces_impactées', {'espèces_impactées.dossier': 'dossier.id'})
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap})
        .andWhere({"dossier.id": dossierId})
        .first()

    /** @type {Promise<ÉvènementPhaseDossier[]>} */
    const évènementsPhaseDossierP = getÉvènementsPhaseDossier(dossierId, databaseConnection)

    if(!databaseConnection.isTransaction){
        // transaction locale à cette fonction
        // nous la refermons donc manuellement
        Promise.all([dossierP, évènementsPhaseDossierP])
            .then(transaction.commit).catch(transaction.rollback)
    }

    return Promise.all([dossierP, évènementsPhaseDossierP])
        .then(([dossier, évènementsPhaseDossier]) => {
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

            return dossier
        })
    
}


/** @type {(keyof DossierRésumé)[]} */
const colonnesDossierRésumé = [
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
    "dossier.id as id",
    //"id_demarches_simplifiées",
    "number_demarches_simplifiées",
    "date_dépôt",
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
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
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
    "déposant.nom as déposant_nom",
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
    "déposant.prénoms as déposant_prénoms",

    // demandeur_personne_physique
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
    "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
    "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",

    // demandeur_personne_morale
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
    "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
    //@ts-expect-error pas exacement une keyof DossierRésumé, mais quand même
    "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",

    // annotations privées
    "enjeu_écologique",
    "enjeu_politique",

    "commentaire_enjeu",

    "historique_identifiant_demande_onagre",

    "historique_date_réception_ddep",
    "historique_date_signature_arrêté_préfectoral",
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

    const result = Promise.all([dossiersP, évènementsPhaseDossierP])
    .then(([dossiers, évènementsPhaseDossier]) => {
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
 * @param {EspècesImpactées['id']} fichierId 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
export function getFichierEspècesImpactées(fichierId, databaseConnection = directDatabaseConnection){
    return databaseConnection('espèces_impactées')
        .select('*')
        .where('id', fichierId)
        .first()
}