import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import { ajouterContrôles } from "./controle.ts";
import { getDossierIdFromDecisionAdministrative } from "./décision_administrative.ts";

import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { default as DécisionAdministrative } from "@pitchou/types/database/public/DécisionAdministrative.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";

export function getPrescriptions(
  décisionIds: DécisionAdministrative["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Prescription[]> {
  return databaseConnection("prescription")
    .select("*")
    .whereIn("décision_administrative", décisionIds)
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

export function ajouterPrescriptionsEtContrôles(prescriptions: Omit<FrontEndPrescription, "id">[]) {
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
