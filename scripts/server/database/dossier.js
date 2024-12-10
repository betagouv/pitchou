import knex from 'knex';

import {directDatabaseConnection} from '../database.js'

//@ts-ignore
/** @import {DossierComplet} from '../../types/API_Pitchou.d.ts' */
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
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


/**
 * 
 * @param {Dossier['id_demarches_simplifiées'][]} DS_ids 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Pick<Dossier, 'id' | 'id_demarches_simplifiées' | 'number_demarches_simplifiées'>[]>}
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
 * @param {Map<Dossier['id'], API_DS_SCHEMA.Traitement[]>} idToTraitements
 * @param {import('knex').Knex.Transaction | import('knex').Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function dumpDossierTraitements(idToTraitements, databaseConnection = directDatabaseConnection) {
    /** @type {ÉvènementPhaseDossier[]} */
    const évènementsPhaseDossier = [];
    
    for(const [dossierId, apiTraitements] of idToTraitements){
        for(const {dateTraitement, state} of apiTraitements){
            évènementsPhaseDossier.push({
                phase: state,
                horodatage: new Date(dateTraitement),
                dossier: dossierId,
                cause_personne: null // signifie que c'est l'outil de sync DS qui est la cause
            })
        }
    };
    
    return databaseConnection('évènement_phase_dossier')
        .insert(évènementsPhaseDossier)
        .onConflict(['dossier', 'phase', 'horodatage'])
        .ignore()
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
    'en_attente_de',
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

    const colonnesÀNePasFusionner = ['id', 'phase', 'prochaine_action_attendue_par', 'prochaine_action_attendue']
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


const colonnesDossierComplet = [
    "dossier.id as id",
    //"id_demarches_simplifiées",
    "number_demarches_simplifiées",
    "statut",
    "date_dépôt",
    "dossier.nom as nom_dossier",
    "espèces_protégées_concernées",
    "espèces_impactées.id as url_fichier_espèces_impactées",
    "rattaché_au_régime_ae",
    "activité_principale",

    // localisation
    "départements",
    "communes",
    "régions",

    // prochaine action attendue
    "phase",
    "prochaine_action_attendue_par",
    "prochaine_action_attendue",

    // déposant
    "déposant.nom as déposant_nom",
    "déposant.prénoms as déposant_prénoms",

    // demandeur_personne_physique
    "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
    "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",

    // demandeur_personne_morale
    "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
    "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",

    // annotations privées
    /*
    "historique_nom_porteur",
    "historique_localisation",
    */
    "ddep_nécessaire",
    "en_attente_de",
    

    "enjeu_écologique",
    "enjeu_politique",
    "commentaire_enjeu",
    "commentaire_libre",
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
 * @param {CapDossier['cap']} cap_dossier 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<DossierComplet[]>}
 */
export async function getDossiersByCap(cap_dossier, databaseConnection = directDatabaseConnection){
    const dossiersP = databaseConnection('dossier')
        .select(colonnesDossierComplet)
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'dossier.id'})
        .join(
            'arête_cap_dossier__groupe_instructeurs', 
            {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'}
        )
        .leftJoin('personne as déposant', {'déposant.id': 'dossier.déposant'})
        .leftJoin('personne as demandeur_personne_physique', {'demandeur_personne_physique.id': 'dossier.demandeur_personne_physique'})
        .leftJoin('entreprise as demandeur_personne_morale', {'demandeur_personne_morale.siret': 'dossier.demandeur_personne_morale'})
        .leftJoin('espèces_impactées', {'espèces_impactées.dossier': 'dossier.id'})
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier})
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

    return dossiersP
}

/**
 * retourne le sous-ensemble d'id accessibles via la cap
 * 
 * @param {Dossier['id'] | Dossier['id'][]} dossierIds
 * @param {CapDossier['cap']} cap
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Dossier['id'][]>}
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
        .then(dossiers => dossiers.map(d => d.id))

    // @ts-ignore
    return ret;
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
 * @param {Partial<Dossier>} dossierParams
 * @returns {Promise<void>}
 */
export function updateDossier(id, dossierParams) {
    return directDatabaseConnection('dossier')
        .where({ id })
        .update(dossierParams)
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