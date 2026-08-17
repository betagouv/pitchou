import type { Knex } from "knex";

import { referentielRowsToBundle } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

import { directDatabaseConnection } from "./database.ts";

import type { ReferentielRows } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import type { ActivitesMethodesMoyensDePoursuiteBundle } from "@pitchou/types/pitchouState.ts";

/**
 * Reads the referential of types d'impact, méthodes and moyens de poursuite — the three tables
 * that replaced `data/activites-methodes-moyens-de-poursuite.ods` (ADR-0001).
 *
 * Rows come out in the order the saisie form should list them. Ordering on the code is enough
 * because the code space is split per classification, so it never interleaves two of them.
 */
export async function getReferentielRows(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ReferentielRows> {
  const [typesImpact, methodes, moyensDePoursuite] = await Promise.all([
    databaseConnection("impact_type")
      .select("*")
      .orderBy(["classification", "identifiant_pitchou"]),
    databaseConnection("impact_methode").select("*").orderBy(["classification", "code"]),
    databaseConnection("impact_moyen_de_poursuite").select("*").orderBy(["classification", "code"]),
  ]);

  return { typesImpact, methodes, moyensDePoursuite };
}

// Cached per connection, the way `geomce.ts` caches the espèces: the referential barely ever
// changes, but a different connection — a test database, a transaction — must get its own entry
// rather than whatever the first caller happened to load.
const referentielParConnexion = new WeakMap<
  Knex.Transaction | Knex,
  Promise<ActivitesMethodesMoyensDePoursuiteBundle>
>();

/**
 * The referential as the app consumes it, indexed by classification then by identifiant Pitchou
 * or code. Same value the browser builds from `/api/referentiel-type-impact-methode-moyen-de-poursuite`.
 */
export function getReferentielTypeImpactMethodeMoyenDePoursuite(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ActivitesMethodesMoyensDePoursuiteBundle> {
  let referentielP = referentielParConnexion.get(databaseConnection);

  if (!referentielP) {
    referentielP = getReferentielRows(databaseConnection)
      .then(referentielRowsToBundle)
      .catch((error) => {
        // Don't keep a rejected promise cached
        referentielParConnexion.delete(databaseConnection);
        throw error;
      });
    referentielParConnexion.set(databaseConnection, referentielP);
  }

  return referentielP;
}
