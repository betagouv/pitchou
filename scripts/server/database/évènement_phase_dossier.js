import knex from 'knex';

import {directDatabaseConnection} from '../database.js'

/** @import {DossierComplet, DossierPhase, DossierRésumé} from '../../types/API_Pitchou.d.ts' */
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../../types/database/public/Personne.ts' */
/** @import {default as Message} from '../../types/database/public/Message.ts' */
/** @import {default as ÉvènementPhaseDossier} from '../../types/database/public/ÉvènementPhaseDossier.ts' */
/** @import {default as CapDossier} from '../../types/database/public/CapDossier.ts' */
/** @import {default as EspècesImpactées} from '../../types/database/public/EspècesImpactées.ts' */
/** @import * as API_DS_SCHEMA from '../../types/démarches-simplifiées/apiSchema.js' */
/** @import {PickNonNullable} from '../../types/tools.d.ts' */

// TypeScript produit des faux warning de non-utilisation https://github.com/microsoft/TypeScript/issues/60908
// mais rajouter un statement juste après les imports enlève ces warning
// Enlever cette ligne après le merge de https://github.com/microsoft/TypeScript/pull/60921
// @ts-ignore
const inutile = true;

/**
 * Converti les "state" des "traitements" DS vers les phases Pitchou
 * Il n'existe pas de manière automatique de d'amener vers l'état "Vérification dossier" depuis DS
 * 
 * @param {API_DS_SCHEMA.Traitement['state']} DSTraitementState
 * @returns {DossierPhase}
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
 * @param {Map<Dossier['id'], API_DS_SCHEMA.Traitement[]>} idToTraitements
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function dumpDossierTraitements(idToTraitements, databaseConnection = directDatabaseConnection) {
    /** @type {ÉvènementPhaseDossier[]} */
    const évènementsPhaseDossier = [];
    
    for(const [dossierId, apiTraitements] of idToTraitements){
        for(const {dateTraitement, state, emailAgentTraitant, motivation} of apiTraitements){
            évènementsPhaseDossier.push({
                phase: traitementPhaseToDossierPhase(state),
                horodatage: new Date(dateTraitement),
                dossier: dossierId,
                cause_personne: null, // signifie que c'est l'outil de sync DS qui est la cause
                DS_emailAgentTraitant: emailAgentTraitant,
                DS_motivation: motivation
            })
        }
    };
    
    return databaseConnection('évènement_phase_dossier')
        .insert(évènementsPhaseDossier)
        .onConflict(['dossier', 'phase', 'horodatage'])
        .merge()
}

/**
 * 
 * @param {ÉvènementPhaseDossier[]} évènementsPhase 
 * @param {knex.Knex.Transaction | knex.Knex} databaseConnection 
 * @returns {Promise<void>}
 */
export async function ajouterÉvènementsPhaseDossier(évènementsPhase, databaseConnection = directDatabaseConnection){
    return databaseConnection('évènement_phase_dossier')
        .insert(évènementsPhase)
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
export async function getÉvènementsPhaseDossier(idDossier, databaseConnection = directDatabaseConnection){

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
