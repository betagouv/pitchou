
/** @import { IndicateursAARRI } from '../../types/API_Pitchou.ts' */

import knex from "knex";
import { directDatabaseConnection, créerTransaction } from "../database.js";

/**
 * Récupère le nombre de personnes qui ont rejoint pour la première fois un groupe d’instructeur DN
 * @param {number} demarcheNumber
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns { Promise<{count: number}[]> }
 */
export async function getNbPersonnesAyantRejointGroupeInstructeur(demarcheNumber, databaseConnection = directDatabaseConnection) {
    return await databaseConnection('groupe_instructeurs')
        .leftJoin('arête_cap_dossier__groupe_instructeurs', {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'groupe_instructeurs.id'})
        .leftJoin('cap_dossier', {'cap_dossier.cap': 'arête_cap_dossier__groupe_instructeurs.cap_dossier'})
        .leftJoin('personne', {'personne.code_accès': 'cap_dossier.personne_cap'})
        .where({"numéro_démarche": demarcheNumber})
        .countDistinct('personne.id')
}

/**
 * Calcule les statistiques AARRI de Pitchou
 * @returns {Promise<IndicateursAARRI>}
 */
export async function getIndicateursAARRI() {
    const transaction = await créerTransaction({ readOnly: true })
    const DEMARCHE_NUMBER = 88444
    try {

        const nombreTotalPersonnesUniquesRow = await getNbPersonnesAyantRejointGroupeInstructeur(DEMARCHE_NUMBER, transaction)

        /** @type {IndicateursAARRI} */
        const indicateurs = {
            nbPersonnesAyantRejointGroupeInstructeur: Number(nombreTotalPersonnesUniquesRow[0].count)
        }

        await transaction.commit()
        return indicateurs
    } catch (e) {
        await transaction.rollback()
        throw e
    }
}