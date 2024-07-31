//@ts-check

import knex from 'knex';

/** @import {DossierComplet} from '../types.js' */
/** @import {GroupeInstructeurs} from "../types/démarches-simplifiées/api.js" */
/** @import {default as Dossier} from '../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../types/database/public/Entreprise.ts' */

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const database = knex({
    client: 'pg',
    connection: DATABASE_URL,
});


/**
 * @param {import('../types/database/public/Personne.js').PersonneInitializer} personne
 */
export function créerPersonne(personne){
    return database('personne')
    .insert(personne)
}

/**
 * @param {import('../types/database/public/Personne.js').PersonneInitializer[]} personnes
 * @returns { Promise<{id: Personne['id']}[]> }
 */
export function créerPersonnes(personnes){
    return database('personne')
    .insert(personnes, ['id'])
}


/**
 * 
 * @param {Personne['code_accès']} code_accès 
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByCode(code_accès) {
    return database('personne')
    .where({ code_accès })
    .select('id')
    .first()
}

/**
 * 
 * @param {Personne['email']} email 
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByEmail(email) {
    return database('personne')
    .where({ email })
    .select()
    .first()
}

/**
 * 
 * @param {Personne['email']} email 
 * @param {Personne['code_accès']} code_accès 
 * @returns 
 */
function updateCodeAccès(email, code_accès){
    return database('personne')
    .where({ email })
    .update({code_accès})
}

/**
 * 
 * @param {Personne['email']} email 
 * @returns {Promise<Personne['code_accès']>}
 */
export function créerPersonneOuMettreÀJourCodeAccès(email){
    const codeAccès = Math.random().toString(36).slice(2)

    return créerPersonne({
        nom: '',
        prénoms: '',
        email,
        code_accès: codeAccès
    })
    .catch(err => {
        // suppose qu'il y a une erreur parce qu'une personne avec cette adresse email existe déjà
        return updateCodeAccès(email, codeAccès)
    })
    .then(() => codeAccès)
}

/**
 * 
 * @returns {Promise<Personne[]>}
 */
export function listAllPersonnes(){
    return database('personne').select()
}





/**
 * 
 * @returns {Promise<Dossier[]>}
 */
export function listAllDossier() {
    return database('dossier').select()
}




/**
 * 
 * @returns {Promise<DossierComplet[]>}
 */
export function listAllDossiersComplets() {
    return database('dossier')
        .select([ 
            "dossier.id as id",
            "id_demarches_simplifiées", 
            "number_demarches_simplifiées",
            "statut", 
            "date_dépôt",
            "dossier.nom as nom_dossier",
            "espèces_protégées_concernées", 
            "rattaché_au_régime_ae",
            
            // localisation
            "départements", 
            "communes", 
            "régions", 
            
            // annotations privées
            "enjeu_écologique", 
            
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
            "historique_nom_porteur",
            "historique_localisation",
            "ddep_nécessaire",
            "en_attente_de",

            "enjeu_écologique",
            "enjeu_politique",
            "commentaire_enjeu",
            
            "historique_date_réception_ddep",
            "commentaire_libre",
            "historique_date_envoi_dernière_contribution",
            "historique_identifiant_demande_onagre",
            "historique_date_saisine_csrpn",
            "historique_date_saisine_cnpn",
            "date_avis_csrpn",
            "date_avis_cnpn",
            "avis_csrpn_cnpn",
            "date_consultation_public",
            "historique_décision",
            "historique_date_signature_arrêté_préfectoral",
            "historique_référence_arrêté_préfectoral",
            "historique_date_signature_arrêté_ministériel",
            "historique_référence_arrêté_ministériel"
        ])
        .leftJoin('personne as déposant', {'déposant.id': 'dossier.déposant'})
        .leftJoin('personne as demandeur_personne_physique', {'demandeur_personne_physique.id': 'dossier.demandeur_personne_physique'})
        .leftJoin('entreprise as demandeur_personne_morale', {'demandeur_personne_morale.siret': 'dossier.demandeur_personne_morale'})
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
 * @param {Dossier[]} dossiers 
 * @returns {Promise<any>}
 */
export function dumpDossiers(dossiers){
    for(const d of dossiers){
        for(const k of varcharKeys){
            if(d[k] && d[k].length >= 255){
                console.warn('Attontion !! Dossier DS numéro', d.number_demarches_simplifiées, 'key', k, '.length >= 255')
                console.warn('Valeur:', d[k])
                
                //console.warn(`On va couper la valeur pour qu'elle rentre en base de données`)
                //d[k] = d[k].slice(0, 255)
            }
        }
    }

    return database('dossier')
    .insert(dossiers)
    .onConflict('number_demarches_simplifiées')
    .merge()
}


/**
 * 
 * @param {number[]} numbers 
 * @returns 
 */
export function deleteDossierByDSNumber(numbers){
    return database('dossier')
        .whereIn('number_demarches_simplifiées', numbers)
        .delete()
}


/**
 * 
 * @returns {Promise<Entreprise[]>}
 */
export function listAllEntreprises(){
    return database('entreprise').select()
}

/**
 * 
 * @param {Entreprise[]} entreprises 
 * @returns {Promise<any>}
 */
export function dumpEntreprises(entreprises){
    return database('entreprise')
    .insert(entreprises)
    .onConflict('siret')
    .merge()
}

/**
 * 
 * @returns {Promise< Map<string, Personne['email'][]> >}
 */
async function getGroupesInstructeurs(){
    const groupesInstructeursBDD = await database('groupe_instructeurs')
        .select([
            'groupe_instructeurs.nom as nom_groupe',
            'email'
        ])
        .leftJoin('arête_groupe_instructeurs__personne', {'arête_groupe_instructeurs__personne.groupe_instructeurs': 'groupe_instructeurs.id'})
        .leftJoin('personne', {'personne.id': 'arête_groupe_instructeurs__personne.personne'})

    const groupeByNom = new Map()

    for(const {nom_groupe, email} of groupesInstructeursBDD){
        const groupeInstructeurs = groupeByNom.get(nom_groupe) || []
        groupeInstructeurs.push(email)
        groupeByNom.set(nom_groupe, groupeInstructeurs)
    }

    return groupeByNom
}

/**
 * Synchroniser le groupes instructeurs dans la base de données avec ceux qui viennent de l'API 
 *
 * @param {GroupeInstructeurs[]} groupesInstructeursAPI 
 */
export async function synchroniserGroupesInstructeurs(groupesInstructeursAPI){
    
    const groupesInstructeursBDD = await getGroupesInstructeurs()

    throw `PPP
        - créer une transaction
        - créer les groupes qui n'existent pas
        - supprimer les groupes qui sont absents
        - mettre à jours les groupes si besoin
    `

    console.log('groupesInstructeursAPI', groupesInstructeursAPI)
    console.log('synchroniserGroupesInstructeurs', groupesInstructeurs)



}