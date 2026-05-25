import { directDatabaseConnection } from "../database.js";

import { getDossierIdFromPrescription } from "./prescription.js";

//@ts-ignore
/** @import {default as Contrôle} from '../../types/database/public/Contrôle.ts' */
//@ts-ignore
/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */
//@ts-ignore
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */

/** @import {Knex} from 'knex' */

/**
 *
 * @param {Prescription['id'][]} prescriptionIds
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Contrôle[]>}
 */
export function getContrôles(prescriptionIds, databaseConnection = directDatabaseConnection) {
  return databaseConnection("contrôle").select("*").whereIn("prescription", prescriptionIds);
}

/**
 *
 * @param {Partial<Contrôle> | Partial<Contrôle>[]} contrôles
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function ajouterContrôles(contrôles, databaseConnection = directDatabaseConnection) {
  return databaseConnection("contrôle")
    .insert(contrôles)
    .returning(["id"])
    .then((contrôles) => contrôles.map((c) => c.id));
}

/**
 *
 * @param {Partial<Contrôle>} contrôle
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function modifierContrôle(contrôle, databaseConnection = directDatabaseConnection) {
  return databaseConnection("contrôle").update(contrôle).where({ id: contrôle.id });
}

/**
 *
 * @param {Contrôle['id']} id
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function supprimerContrôle(id, databaseConnection = directDatabaseConnection) {
  return databaseConnection("contrôle").delete().where({ id });
}

/**
 *
 * @param {Contrôle['id']} id
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Dossier['id'] | undefined>}
 */
export async function getDossierIdFromControle(id, databaseConnection = directDatabaseConnection) {
  const rows = await databaseConnection("contrôle").select(["prescription"]).where({ id });
  const prescriptionId = rows[0]?.prescription;
  if (!prescriptionId) return undefined;
  return getDossierIdFromPrescription(prescriptionId, databaseConnection);
}
