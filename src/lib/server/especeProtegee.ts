import type { Knex } from "knex";

// Relative imports (not the `$` aliases) so this module also resolves under `tsx`,
// which runs the CLI generator and the seeds.
import { directDatabaseConnection } from "../../../scripts/server/database.ts";

import type {
  default as EspeceProtegee,
  EspeceProtegeeInitializer,
} from "../../../scripts/types/database/public/EspeceProtegee.ts";

// Re-exported so server consumers can convert rows from the same module they fetch
// them with. The implementation is knex-free and lives in `commun` so the front-end
// can reuse it on rows received from the API.
export { dbRowToEspeceProtegee } from "../../../scripts/commun/outils-espèces.ts";

export function getEspecesProtegees(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegee[]> {
  return databaseConnection("espece_protegee").select("*");
}

/**
 * Replaces the whole `espece_protegee` table in one transaction: truncate then
 * batch insert. Used by the INPN generator (`outils/liste-espèces.ts`) and the
 * bootstrap seed.
 */
export async function replaceEspecesProtegees(
  rows: EspeceProtegeeInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  const run = async (trx: Knex.Transaction) => {
    await trx("espece_protegee").truncate();
    if (rows.length >= 1) {
      await trx.batchInsert("espece_protegee", rows, 1000);
    }
  };

  // Reuse the caller's transaction if there is one, otherwise open our own.
  if ((databaseConnection as Knex.Transaction).isTransaction) {
    return run(databaseConnection as Knex.Transaction);
  }
  return (databaseConnection as Knex).transaction(run);
}
