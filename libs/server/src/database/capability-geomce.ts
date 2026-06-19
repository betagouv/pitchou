import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as CapabilityGeomce } from "@pitchou/types/database/public/CapabilityGeomce.ts";

export async function miseEnPlaceSecretGeoMCE(
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

export async function verifierSecretGeoMCE(
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
 * Fonction sensible. À appeler avec prudence
 */
export async function récupérerSecretGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const { secret } = await databaseConnection("capability-geomce").select("*").first();

  return secret;
}

/**
 * Fonction sensible. À appeler avec prudence
 */
export async function resetSecretGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<CapabilityGeomce["secret"]> {
  // supprimer le secret existant
  await databaseConnection("capability-geomce").delete();

  // créer un nouveau secret
  const [{ secret }] = await databaseConnection("capability-geomce")
    .insert({})
    .returning(["secret"]);

  return secret;
}
