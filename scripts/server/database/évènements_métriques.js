import knex from 'knex';
import {directDatabaseConnection} from '../database.js'

/** @import { ÉvènementMétrique } from '../../types/évènement.js' */

/**
 * @param {string} cap
 * @param {ÉvènementMétrique} évènement
 */
export async function ajouterÉvènementDepuisCap(cap, évènement) {
    const personne = await directDatabaseConnection('cap_évènement_métrique')
        .select('id')
        .from('personne')
        .join('cap_évènement_métrique', {'cap_évènement_métrique.personne_cap': 'personne.code_accès'})
        .where({'cap_évènement_métrique.cap': cap})
        .first()

    if (!personne) {
        throw new Error('Pas de personne avec cette capability')
    }

    await directDatabaseConnection('évènement_métrique')
        .insert({
            évènement: évènement.type,
            détails: 'détails' in évènement ? évènement.détails : null,
            personne: personne.id
        })
}

/**
 * Crée un évènement "rejoindreGroupeInstructricePourLaPremièreFois" pour les personnes qui sont dans un groupe instructrice dans Démarche Numérique mais qui n'ont pas cet événement dans la table évènement_métrique (pour un numéro de démarche donné)
 * @param {number} numéroDémarche
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<void>}
 */
export function créerÉvènementRejoindreGroupeInstructrice(
  numéroDémarche = 88444,
  databaseConnection = directDatabaseConnection,
) {
    const détails = JSON.stringify({ "numéro_démarche": numéroDémarche });

    const évènementrejoindreGroupeInstructricePourLaPremièreFois = 'rejoindreGroupeInstructricePourLaPremièreFois'

    const sql = `
    WITH rejoindre_groupe_premiere_fois AS (
        SELECT *
        FROM évènement_métrique
        WHERE évènement = '${évènementrejoindreGroupeInstructricePourLaPremièreFois}'
        AND détails = '${détails}'
    )
    INSERT INTO évènement_métrique (personne, évènement, détails)
    SELECT p.id, '${évènementrejoindreGroupeInstructricePourLaPremièreFois}', '${détails}'
    FROM personne p
    LEFT JOIN rejoindre_groupe_premiere_fois rgpf
        ON p.id = rgpf.personne
    WHERE EXISTS (
        SELECT *
        FROM arête_personne_suit_dossier apsd
        JOIN arête_groupe_instructeurs__dossier agid
        ON apsd.dossier = agid.dossier
        WHERE p.id = apsd.personne
    )
    AND rgpf.évènement IS NULL
    `;

    return databaseConnection.raw(sql);
}
