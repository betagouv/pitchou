import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { IdentiteDossierInitializer } from "@pitchou/types/database/public/IdentiteDossier.ts";
import type { IdentiteDossierData } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

/**
 * Replace the identities (demandeur, mandataire, representant) of each dossier with the
 * ones freshly extracted from Démarche Numérique. An identity that disappeared in DN
 * (e.g. a mandataire removed) is removed here as well.
 */
export async function syncIdentitesDossier(
  identitesByDossierId: Map<DossierId, IdentiteDossierData[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const dossierIds = [...identitesByDossierId.keys()];

  if (dossierIds.length === 0) {
    return;
  }

  await databaseConnection("identite_dossier").whereIn("dossier", dossierIds).delete();

  const identites: IdentiteDossierInitializer[] = [...identitesByDossierId].flatMap(
    ([dossier, identitesDossier]) => identitesDossier.map((identite) => ({ ...identite, dossier })),
  );

  if (identites.length >= 1) {
    return databaseConnection("identite_dossier").insert(identites);
  }
}
