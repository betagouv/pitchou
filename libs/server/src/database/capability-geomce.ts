import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as CapabilityGeomce } from "@pitchou/types/database/public/CapabilityGeomce.ts";

export async function setupSecretGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  const secretsGeoMCE = await databaseConnection("capability-geomce").select("*");

  if (secretsGeoMCE.length === 0) {
    console.log(`Aucune capability GeoMCE détectée. Création d'une capability GeoMCE`);
    await databaseConnection("capability-geomce").insert({});
  }

  if (secretsGeoMCE.length >= 2) {
    console.warn(
      `${secretsGeoMCE} secrets GeoMCE détectés. C'est bizarre, parce qu'on n'en attendait qu'un seul`,
    );
  }
}

export async function verifySecretGeoMCE(
  secret: CapabilityGeomce["secret"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  const secretsGeoMCE = await databaseConnection("capability-geomce")
    .select("*")
    .where({ secret: secret });

  if (secretsGeoMCE.length === 0) {
    throw new Error(`Capability ${secret} non reconnue`);
  }
}

/**
 * Sensitive function. To be called with caution
 */
export async function getSecretGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const { secret } = await databaseConnection("capability-geomce").select("*").first();

  return secret;
}

/**
 * Sensitive function. To be called with caution
 */
export async function resetSecretGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<CapabilityGeomce["secret"]> {
  // delete the existing secret
  await databaseConnection("capability-geomce").delete();

  // create a new secret
  const [{ secret }] = await databaseConnection("capability-geomce")
    .insert({})
    .returning(["secret"]);

  return secret;
}
