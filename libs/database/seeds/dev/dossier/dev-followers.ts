import type { Knex } from "knex";

import { SEED_DOSSIERS_SUIVIS_PAR_DEV } from "../../fixtures/dossiers.ts";
import type { seedDossierActors } from "./actors.ts";

type Person = Awaited<ReturnType<typeof seedDossierActors>>["person"];

export async function seedDevFollowers(
  transaction: Knex.Transaction,
  person: Person,
  dossierIdMap: Record<string, number>,
) {
  if (person) {
    for (const dsNumber of SEED_DOSSIERS_SUIVIS_PAR_DEV) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(`  ⚠ suivi dossier — dossier DS ${dsNumber} non résolu`);
        continue;
      }

      await transaction("edge_personne_follows_dossier")
        .insert({ personne: person.id, dossier: dossierId })
        .onConflict(["personne", "dossier"])
        .ignore();
    }
  }
}
