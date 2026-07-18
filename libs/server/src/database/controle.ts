import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import { getDossierIdFromPrescription } from "./prescription.ts";

import type { default as Controle } from "@pitchou/types/database/public/Controle.ts";
import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";

export function getControles(
  prescriptionIds: Prescription["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Controle[]> {
  return databaseConnection("controle").select("*").whereIn("prescription", prescriptionIds);
}

export function addControles(
  controles: Partial<Controle> | Partial<Controle>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("controle")
    .insert(controles)
    .returning(["id"])
    .then((controles) => controles.map((c) => c.id));
}

export function updateControle(
  controle: Partial<Controle>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("controle").update(controle).where({ id: controle.id });
}

export function deleteControle(
  id: Controle["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("controle").delete().where({ id });
}

export async function getDossierIdFromControle(
  id: Controle["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"] | undefined> {
  const rows = await databaseConnection("controle").select(["prescription"]).where({ id });
  const prescriptionId = rows[0]?.prescription;
  if (!prescriptionId) return undefined;
  return getDossierIdFromPrescription(prescriptionId, databaseConnection);
}
