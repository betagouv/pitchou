import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { insertBatches } from "./insertBatches.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { IdentiteDossierInitializer } from "@pitchou/types/database/public/IdentiteDossier.ts";
import type { IdentiteDossierData } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

/**
 * Replace the identities (demandeur, mandataire, representant) of each dossier with the
 * ones freshly extracted from Démarche Numérique. An identity that disappeared in DN
 * (e.g. a mandataire removed) is removed here as well.
 *
 * Still written while identite_dossier is replaced by dossier_acteur, which now carries
 * the historique; to be removed soon.
 */
export async function syncIdentitesDossier(
  identitesByDossierId: Map<DossierId, IdentiteDossierData[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) => syncIdentitesDossier(identitesByDossierId, trx));
  const dossierIds = [...identitesByDossierId.keys()];

  if (dossierIds.length === 0) return;

  await databaseConnection("identite_dossier").whereIn("dossier", dossierIds).delete();

  const identites: IdentiteDossierInitializer[] = [...identitesByDossierId].flatMap(
    ([dossier, identitesDossier]) => identitesDossier.map((identite) => ({ ...identite, dossier })),
  );

  for (const batch of insertBatches(identites))
    await databaseConnection("identite_dossier").insert(batch);
}
