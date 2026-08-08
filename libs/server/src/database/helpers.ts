import type { Knex } from "knex";
import { directDatabaseConnection } from "./connection.ts";
import type Entreprise from "@pitchou/types/database/public/Entreprise.ts";
import type DemarcheNumerique88444SynchronizationResult from "@pitchou/types/database/public/DemarcheNumerique88444SynchronizationResult.ts";

export function listAllEntreprises(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Entreprise[]> {
  return databaseConnection("entreprise").select();
}

export function dumpEntreprises(
  entreprises: Entreprise[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("entreprise").insert(entreprises).onConflict("siret").merge();
}

export async function getDemarcheNumerique88444SynchronizationResults(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DemarcheNumerique88444SynchronizationResult[]> {
  return databaseConnection("demarche_numerique_88444_synchronization_result").select("*");
}

export async function addDemarcheNumerique88444SynchronizationResult(
  result: DemarcheNumerique88444SynchronizationResult,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("demarche_numerique_88444_synchronization_result")
    .insert([result])
    .onConflict("success")
    .merge();
}
