import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.js";

import { getDossierIdFromPrescription } from "./prescription.ts";

import type { default as Contrôle } from "../../types/database/public/Contrôle.ts";
import type { default as Prescription } from "../../types/database/public/Prescription.ts";
import type { default as Dossier } from "../../types/database/public/Dossier.ts";

export function getContrôles(
  prescriptionIds: Prescription["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Contrôle[]> {
  return databaseConnection("contrôle").select("*").whereIn("prescription", prescriptionIds);
}

export function ajouterContrôles(
  contrôles: Partial<Contrôle> | Partial<Contrôle>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("contrôle")
    .insert(contrôles)
    .returning(["id"])
    .then((contrôles) => contrôles.map((c) => c.id));
}

export function modifierContrôle(
  contrôle: Partial<Contrôle>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("contrôle").update(contrôle).where({ id: contrôle.id });
}

export function supprimerContrôle(
  id: Contrôle["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("contrôle").delete().where({ id });
}

export async function getDossierIdFromControle(
  id: Contrôle["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"] | undefined> {
  const rows = await databaseConnection("contrôle").select(["prescription"]).where({ id });
  const prescriptionId = rows[0]?.prescription;
  if (!prescriptionId) return undefined;
  return getDossierIdFromPrescription(prescriptionId, databaseConnection);
}
