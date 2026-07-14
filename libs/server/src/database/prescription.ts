import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import { ajouterControles } from "./controle.ts";
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
    .whereIn("décision_administrative", decisionIds)
    .orderBy("date_échéance", "asc");
}

export function ajouterPrescription(
  prescription: Partial<Prescription>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ prescriptionId: Prescription["id"] }> {
  return databaseConnection("prescription")
    .insert(prescription)
    .returning(["id"])
    .then((prescriptions) => ({ prescriptionId: prescriptions[0].id }));
}

export function ajouterPrescriptionsEtControles(prescriptions: Omit<FrontEndPrescription, "id">[]) {
  return Promise.allSettled(
    prescriptions.map((prescription) => {
      const controles = prescription.contrôles;
      delete prescription.contrôles;

      return ajouterPrescription(prescription).then(({ prescriptionId }) => {
        if (controles && controles.length >= 1) {
          for (const contrôle of controles) {
            contrôle.prescription = prescriptionId;
          }

          return ajouterControles(controles);
        }
      });
    }),
  );
}

export function modifierPrescription(
  prescription: Partial<Prescription>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("prescription").update(prescription).where({ id: prescription.id });
}

export function supprimerPrescription(
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
    .select(["décision_administrative"])
    .where({ id });
  const decisionAdministrativeId = rows[0]?.décision_administrative;
  if (!decisionAdministrativeId) return undefined;
  return getDossierIdFromDecisionAdministrative(decisionAdministrativeId, databaseConnection);
}
