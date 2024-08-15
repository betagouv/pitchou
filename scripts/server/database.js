//@ts-check

import knex from 'knex';

/** @import {DossierComplet} from '../types.js' */
/** @import * as API_DS from "../types/démarches-simplifiées/api.js" */
/** @import {default as Dossier} from '../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../types/database/public/Entreprise.ts' */
/** @import {default as GroupeInstructeurs} from '../types/database/public/GroupeInstructeurs.ts' */

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const directDatabaseConnection = knex({
    client: 'pg',
    connection: DATABASE_URL,
});

/**
 * 
 * @returns {ReturnType<knex.Knex['destroy']>}
 */
export function closeDatabaseConnection(){
    return directDatabaseConnection.destroy()
}

/**
 * @param {import('../types/database/public/Personne.js').PersonneInitializer} personne
 */
export function créerPersonne(personne){
    return directDatabaseConnection('personne')
    .insert(personne)
}

/**
 * @param {import('../types/database/public/Personne.js').PersonneInitializer[]} personnes
 * @returns { Promise<{id: Personne['id']}[]> }
 */
export function créerPersonnes(personnes){
    return directDatabaseConnection('personne')
    .insert(personnes, ['id'])
}


/**
 * 
 * @param {Personne['code_accès']} code_accès 
 * @returns {Promise<Personne> | Promise<undefined>}
 */
export function getPersonneByCode(code_accès) {
    return directDatabaseConnection('personne')
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
    return directDatabaseConnection('personne')
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
    return directDatabaseConnection('personne')
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
    return directDatabaseConnection('personne').select()
}





/**
 * 
 * @returns {Promise<Dossier[]>}
 */
export function listAllDossier() {
    return directDatabaseConnection('dossier').select()
}




/**
 * 
 * @returns {Promise<DossierComplet[]>}
 */
export function listAllDossiersComplets() {
    return directDatabaseConnection('dossier')
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
            
            // prochaine action attendue
            "phase",
            "prochaine_action_attendue_par",
            "prochaine_action_attendue",

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

    return directDatabaseConnection('dossier')
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
    return directDatabaseConnection('dossier')
        .whereIn('number_demarches_simplifiées', numbers)
        .delete()
}

/**
 * 
 * @param {Dossier['id']} id 
 * @param {Partial<Dossier>} dossierParams
 * @returns {Promise<Dossier>}
 */
export function updateDossier(id, dossierParams) {
    return directDatabaseConnection('dossier')
    .where({ id })
    .returning('*')
    .update(dossierParams)
}

/**
 * 
 * @returns {Promise<Entreprise[]>}
 */
export function listAllEntreprises(){
    return directDatabaseConnection('entreprise').select()
}

/**
 * 
 * @param {Entreprise[]} entreprises 
 * @returns {Promise<any>}
 */
export function dumpEntreprises(entreprises){
    return directDatabaseConnection('entreprise')
    .insert(entreprises)
    .onConflict('siret')
    .merge()
}

/**
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise< Map<string, {id: GroupeInstructeurs['id'], instructeurs: Set<NonNullable<Personne['email']>>}> >}
 */
async function getGroupesInstructeurs(databaseConnection = directDatabaseConnection){
    const groupesInstructeursBDD = await databaseConnection('groupe_instructeurs')
        .select([
            'groupe_instructeurs.id as id_groupe',
            'groupe_instructeurs.nom as nom_groupe',
            'email'
        ])
        .leftJoin('arête_groupe_instructeurs__personne', {'arête_groupe_instructeurs__personne.groupe_instructeurs': 'groupe_instructeurs.id'})
        .leftJoin('personne', {'personne.id': 'arête_groupe_instructeurs__personne.personne'})
            .whereNotNull('email')

    const groupeByNom = new Map()

    for(const {id_groupe, nom_groupe, email} of groupesInstructeursBDD){
        const groupeInstructeurs = groupeByNom.get(nom_groupe) || {id: id_groupe, instructeurs: new Set()}
        if(email){
            groupeInstructeurs.instructeurs.add(email)
        }
        groupeByNom.set(nom_groupe, groupeInstructeurs)
    }

    return groupeByNom
}


/**
 * 
 * @param {API_DS.GroupeInstructeurs[]} groupesInstructeursAPI 
 * @param {Map<Personne['email'], Partial<Personne>>} instructeurParEmail 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
async function créerGroupesInstructeurs(groupesInstructeursAPI, instructeurParEmail, databaseConnection = directDatabaseConnection){
    const nomsGroupes = groupesInstructeursAPI.map(g => ({nom: g.label}))
    
    const nouveauxGroupes = await databaseConnection('groupe_instructeurs')
        .insert(nomsGroupes)
        .returning(['id', 'nom'])


    const arêtes = groupesInstructeursAPI
        .map(({label, instructeurs}) => {
            const groupe_instructeurs = nouveauxGroupes.find(g => g.nom === label).id

            return instructeurs.map(({email}) => {
                //@ts-ignore TS ne peut pas comprendre que le get retourne toujours
                const personne = instructeurParEmail.get(email).id
                return ({groupe_instructeurs, personne})
            })
        })
        .flat(Infinity)

    //console.log('arêtes', arêtes)

    return databaseConnection('arête_groupe_instructeurs__personne')
        .insert(arêtes)
}

/**
 * 
 * @param {GroupeInstructeurs['id'][]} groupeIds 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns 
 */
async function supprimerGroupesInstructeurs(groupeIds, databaseConnection = directDatabaseConnection){
    return databaseConnection('groupe_instructeurs')
        .delete()
        .whereIn('id', groupeIds);
}


/**
 * 
 * @param {string[]} emails 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Pick<Personne, 'id' | 'email'>[]>}
 */
async function insertOrSelectPersonneParEmail(emails, databaseConnection = directDatabaseConnection){
    await databaseConnection('personne')
        .insert(emails.map(email => ({ email })))
        .onConflict('email')
        .ignore()

    return databaseConnection('personne')
        .select(['id', 'email'])
        .whereIn('email', emails);
}


/**
 * 
 * @param {GroupeInstructeurs['id']} groupe_instructeurs 
 * @param {Set<string>} emails
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @return {Promise<void>}
 */
async function ajouterPersonnesDansGroupeParEmails(groupe_instructeurs, emails, databaseConnection = directDatabaseConnection){
    const personnesAvecCesEmails = await databaseConnection('personne')
        .select('id')
        .whereIn('email', [...emails]);

    const arêtes = personnesAvecCesEmails
        .map(({id: personne}) => ({groupe_instructeurs, personne}))

    return databaseConnection('arête_groupe_instructeurs__personne')
        .insert(arêtes)
}


/**
 * 
 * @param {GroupeInstructeurs['id']} groupe_instructeurs 
 * @param {Set<string>} emails
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<void>}
 */
async function supprimerPersonnesDansGroupeParEmail(groupe_instructeurs, emails, databaseConnection = directDatabaseConnection){
    const personnesAvecCesEmails = await databaseConnection('personne')
        .select('id')
        .whereIn('email', [...emails]);

    return databaseConnection('arête_groupe_instructeurs__personne')
        .whereIn(
            ['groupe_instructeurs', 'personne'],
            personnesAvecCesEmails.map(({id: personne}) => 
                ( [groupe_instructeurs, personne] )
            )
        )
        .delete()
}



/**
 * Synchroniser le groupes instructeurs dans la base de données avec ceux qui viennent de l'API 
 *
 * @param {API_DS.GroupeInstructeurs[]} groupesInstructeursAPI 
 */
export async function synchroniserGroupesInstructeurs(groupesInstructeursAPI){

    return directDatabaseConnection.transaction(async trx => {
        
        const instructeursEnBDD = await insertOrSelectPersonneParEmail(
            [...new Set(
                groupesInstructeursAPI
                    .map(({instructeurs}) => instructeurs.map(({email}) => email))
                    .flat(Infinity)
            )]
        )

        const instructeurParEmail = new Map(instructeursEnBDD.map(i => [i.email, i]))

        //console.log('instructeursEnBDD', instructeurParEmail)

        const groupesInstructeursBDD = await getGroupesInstructeurs(trx)

        //console.log('groupesInstructeursAPI', groupesInstructeursAPI)
        //console.log('synchroniserGroupesInstructeurs', groupesInstructeursBDD)

        // Créer en BDD les groupes qui n'y sont pas encore
        const groupesInstructeursDansDSAbsentEnBDD = groupesInstructeursAPI.filter(({label}) => !groupesInstructeursBDD.has(label))

        //console.log('groupesInstructeursDansDSAbsentEnBDD', groupesInstructeursDansDSAbsentEnBDD)

        const groupesInstructeursManquantsEnBDDCréés = groupesInstructeursDansDSAbsentEnBDD.length >= 1 ?
            créerGroupesInstructeurs(groupesInstructeursDansDSAbsentEnBDD, instructeurParEmail, trx) : 
            Promise.resolve()

        
        // Supprimer en BDD les groupes qui sont absents de DS
        const groupesInstructeursEnBDDAbsentsDansDS = new Map([...groupesInstructeursBDD]
            .filter(([nom_groupe]) => !groupesInstructeursAPI.find(({label}) => label === nom_groupe))
        )


        //console.log('groupesInstructeurs En BDD Absents Dans DS (donc à supprimer)', groupesInstructeursEnBDDAbsentsDansDS)

        const groupesInstructeursEnTropEnBDDSupprimés = groupesInstructeursEnBDDAbsentsDansDS.size >= 1 ?
            supprimerGroupesInstructeurs([...groupesInstructeursEnBDDAbsentsDansDS.values()].map(({id}) => id), trx) : 
            Promise.resolve()

        // Pour les groupes qui sont présents dans les deux, trouver les groupes qui ont besoin 
        // d'une mise à jour de la liste des personnes
        const miseÀJourEmailsDansGroupe = Promise.all(groupesInstructeursAPI.map(({label, instructeurs: groupeAPIEmails}) => {
            const groupeBDD = groupesInstructeursBDD.get(label)

            if(groupeBDD){
                const {id: idGroupeInstructeurs, instructeurs} = groupeBDD
                /** @type {Set<string>} */
                const groupeBDDEmailsÀEnlever = new Set(instructeurs)
                /** @type {Set<string>} */
                const groupeBDDEmailÀAJouter = new Set()

                for(const {email} of groupeAPIEmails){
                    if(groupeBDDEmailsÀEnlever.has(email)){
                        // l'email est dans les deux, c'est cool
                        groupeBDDEmailsÀEnlever.delete(email)
                    }
                    else{
                        // l'email est dans le groupe dans l'API, mais pas encore en BDD
                        groupeBDDEmailÀAJouter.add(email)
                    }   
                }
                // à la fin de cette opération, dans groupeBDDEmailsÀEnlever, 
                // il reste les emails à enlever (parce qu'ils sont absents de la réponse de l'API)

                //console.log('groupeBDD', label)
                //console.log('groupeBDDEmailÀAJouter', groupeBDDEmailÀAJouter)
                //console.log('groupeBDDEmailsÀEnlever', groupeBDDEmailsÀEnlever)

                let ajoutEmailsDansGroupe = Promise.resolve()
                let suppressionEmailsDansGroupe = Promise.resolve()

                if(groupeBDDEmailÀAJouter.size >= 1){
                    ajoutEmailsDansGroupe = ajouterPersonnesDansGroupeParEmails(idGroupeInstructeurs, groupeBDDEmailÀAJouter, trx)
                }

                if(groupeBDDEmailsÀEnlever.size >= 1){
                    suppressionEmailsDansGroupe = supprimerPersonnesDansGroupeParEmail(idGroupeInstructeurs, groupeBDDEmailsÀEnlever, trx)
                }

                return Promise.all([ajoutEmailsDansGroupe, suppressionEmailsDansGroupe])
            }
            else{
                // les groupes d'instructeurs dans l'API et absents de la BDD ont été créé dans créerGroupesInstructeurs
                // donc rien à faire
                return Promise.resolve()
            }
        }))

        return Promise.all([
            groupesInstructeursManquantsEnBDDCréés,
            groupesInstructeursEnTropEnBDDSupprimés,
            miseÀJourEmailsDansGroupe
        ])

    })


}