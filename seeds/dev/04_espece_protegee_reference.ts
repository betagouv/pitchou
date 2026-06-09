import type { Knex } from "knex";

import { rebuildEspeceProtegeeReference } from "../../src/lib/server/especeProtegeeReference.ts";

// Rebuilds the `espece_protegee_reference` table from the source tables seeded just
// before (espece_taxref + espece_bdc_statut). Exactly as
// `just generate-especes-protegees` does in production. The manual layer (seeds 05/06)
// is layered on top by the `espece_protegee` view, never by this rebuild.
export async function seed(knex: Knex) {
  await rebuildEspeceProtegeeReference(knex);

  console.log("  Rebuild espece_protegee_reference OK");
}
