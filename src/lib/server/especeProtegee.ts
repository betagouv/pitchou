import type { Knex } from "knex";

// Relative imports (not the `$` aliases) so this module also resolves under `tsx`,
// which runs the CLI generator and the seeds.
import { directDatabaseConnection } from "../../../scripts/server/database.ts";

import type { default as EspeceProtegee } from "../../../scripts/types/database/public/EspeceProtegee.ts";
import type {
  default as EspeceProtegeeModification,
  EspeceProtegeeModificationInitializer,
  EspeceProtegeeModificationCdRef,
} from "../../../scripts/types/database/public/EspeceProtegeeModification.ts";

// Re-exported so server consumers can convert rows from the same module they fetch
// them with. The implementation is knex-free and lives in `commun` so the front-end
// can reuse it on rows received from the API.
export { dbRowToEspeceProtegee } from "../../../scripts/commun/outils-espèces.ts";

/**
 * Reads the merged `espece_protegee` view (reference table + manual layer fused by
 * SQL) and normalizes the row shape. This is what every public consumer
 * (`/api/especes-protegees`, geomce…) sees.
 */
export async function getEspecesProtegees(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegee[]> {
  const rows = await databaseConnection<EspeceProtegee>("espece_protegee").select("*");
  return rows.map(normaliserLigneVue);
}

/**
 * Normalizes a row read from the `espece_protegee` view. Kanel infers the view
 * columns as non-null, but a view offers no constraints, so we coerce to the defaults
 * the app expects (`[]`, `false`) — consumers always get the effective, non-null shape.
 */
function normaliserLigneVue(row: EspeceProtegee): EspeceProtegee {
  return {
    cd_ref: row.cd_ref,
    classification: row.classification,
    noms_scientifiques: row.noms_scientifiques ?? [],
    noms_vernaculaires: row.noms_vernaculaires ?? [],
    cd_type_statuts: row.cd_type_statuts ?? [],
    espece_ministerielle: row.espece_ministerielle ?? false,
    espece_cnpn: row.espece_cnpn ?? false,
  };
}

/** Returns the raw manual-layer rows (overrides, additions, exclusions). */
export function getEspecesProtegeesModifications(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegeeModification[]> {
  return databaseConnection("espece_protegee_modification").select("*");
}

/**
 * Upserts a manual modification for a `cd_ref`. The patch is sparse: only the keys
 * present are written; the others keep their current value (or stay NULL = inherited
 * from the reference). `updated_at` is bumped on every write.
 */
export async function upsertEspeceProtegeeModification(
  cd_ref: EspeceProtegeeModificationCdRef | string,
  patch: Omit<EspeceProtegeeModificationInitializer, "cd_ref">,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("espece_protegee_modification")
    .insert({
      ...patch,
      cd_ref: cd_ref as EspeceProtegeeModificationCdRef,
    })
    .onConflict("cd_ref")
    .merge({ ...patch, updated_at: databaseConnection.fn.now() });
}

/** Removes a manual modification entirely, reverting the `cd_ref` to the reference. */
export async function deleteEspeceProtegeeModification(
  cd_ref: EspeceProtegeeModificationCdRef | string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("espece_protegee_modification").where({ cd_ref }).delete();
}
