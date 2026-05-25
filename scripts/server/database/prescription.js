import { directDatabaseConnection } from "../database.js";

import { ajouterContrôles } from "./controle.js";
import { getDossierIdFromDecisionAdministrative } from "./décision_administrative.js";

//@ts-ignore
/** @import {default as Prescription} from '../../types/database/public/Prescription.ts' */
//@ts-ignore
/** @import {default as DécisionAdministrative} from '../../types/database/public/DécisionAdministrative.ts' */
//@ts-ignore
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {FrontEndPrescription} from '../../types/API_Pitchou.ts' */

/** @import {Knex} from 'knex' */

/**
 *
 * @param {DécisionAdministrative['id'][]} décisionIds
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Prescription[]>}
 */
export function getPrescriptions(décisionIds, databaseConnection = directDatabaseConnection) {
  return databaseConnection("prescription")
    .select("*")
    .whereIn("décision_administrative", décisionIds)
    .orderBy("date_échéance", "asc");
}

/**
 *
 * @param {Partial<Prescription>} prescription
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<{prescriptionId: Prescription['id']}>}
 */
export function ajouterPrescription(prescription, databaseConnection = directDatabaseConnection) {
  return databaseConnection("prescription")
    .insert(prescription)
    .returning(["id"])
    .then((prescriptions) => ({ prescriptionId: prescriptions[0].id }));
}

/**
 *
 * @param {Omit<FrontEndPrescription, 'id'>[]} prescriptions
 */
export function ajouterPrescriptionsEtContrôles(prescriptions) {
  return Promise.allSettled(
    prescriptions.map((prescription) => {
      const contrôles = prescription.contrôles;
      delete prescription.contrôles;

      return ajouterPrescription(prescription).then(({ prescriptionId }) => {
        if (contrôles && contrôles.length >= 1) {
          for (const contrôle of contrôles) {
            contrôle.prescription = prescriptionId;
          }

          return ajouterContrôles(contrôles);
        }
      });
    }),
  );
}

/**
 *
 * @param {Partial<Prescription>} prescription
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function modifierPrescription(prescription, databaseConnection = directDatabaseConnection) {
  return databaseConnection("prescription").update(prescription).where({ id: prescription.id });
}

/**
 *
 * @param {Prescription['id']} id
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function supprimerPrescription(id, databaseConnection = directDatabaseConnection) {
  return databaseConnection("prescription").delete().where({ id });
}

/**
 *
 * @param {Prescription['id']} id
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Dossier['id'] | undefined>}
 */
export async function getDossierIdFromPrescription(
  id,
  databaseConnection = directDatabaseConnection,
) {
  const rows = await databaseConnection("prescription")
    .select(["décision_administrative"])
    .where({ id });
  const decisionAdministrativeId = rows[0]?.décision_administrative;
  if (!decisionAdministrativeId) return undefined;
  return getDossierIdFromDecisionAdministrative(decisionAdministrativeId, databaseConnection);
}
