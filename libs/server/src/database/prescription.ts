import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import { addControles } from "./controle.ts";
import { getDossierIdFromDecisionAdministrative } from "./decision_administrative.ts";

import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { default as DecisionAdministrative } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";

export function getPrescriptions(
  decisionIds: DecisionAdministrative["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Prescription[]> {
  return databaseConnection("prescription")
    .select("*")
    .whereIn("decision_administrative", decisionIds)
    .orderBy("due_date", "asc");
}

export function addPrescription(
  prescription: Partial<Prescription>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ prescriptionId: Prescription["id"] }> {
  return databaseConnection("prescription")
    .insert(prescription)
    .returning(["id"])
    .then((prescriptions) => ({ prescriptionId: prescriptions[0].id }));
}

export function addPrescriptionsEtControles(
  prescriptions: Omit<FrontEndPrescription, "id">[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection.transaction(async (transaction) =>
    Promise.all(
      prescriptions.map(async ({ controles, ...prescription }) => {
        const { prescriptionId } = await addPrescription(prescription, transaction);
        if (controles && controles.length >= 1) {
          return addControles(
            controles.map((controle) => ({ ...controle, prescription: prescriptionId })),
            transaction,
          );
        }
      }),
    ),
  );
}

export function updatePrescription(
  prescription: Partial<Prescription>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("prescription").update(prescription).where({ id: prescription.id });
}

export function deletePrescription(
  id: Prescription["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("prescription").delete().where({ id });
}

export async function getDossierIdFromPrescription(
  id: Prescription["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"] | undefined> {
  const rows = await databaseConnection("prescription")
    .select(["decision_administrative"])
    .where({ id });
  const decisionAdministrativeId = rows[0]?.decision_administrative;
  if (!decisionAdministrativeId) return undefined;
  return getDossierIdFromDecisionAdministrative(decisionAdministrativeId, databaseConnection);
}
