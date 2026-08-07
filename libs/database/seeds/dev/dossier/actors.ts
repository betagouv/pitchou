import type { Knex } from "knex";

import { SEED_ENTREPRISES, SEED_PERSONNES } from "../../fixtures/dossiers.ts";

export async function seedDossierActors(transaction: Knex.Transaction, seedEmail: string) {
  const person = await transaction("personne").where({ email: seedEmail }).first();
  const devCap = person?.access_code
    ? await transaction("cap_dossier").where({ personne_cap: person.access_code }).first()
    : null;
  for (const entreprise of SEED_ENTREPRISES) {
    await transaction("entreprise").insert(entreprise).onConflict("siret").merge();
  }
  for (const personne of SEED_PERSONNES) {
    await transaction("personne").insert(personne).onConflict("email").merge();
  }
  const personneRows = await transaction("personne")
    .whereIn(
      "email",
      SEED_PERSONNES.map((p) => p.email),
    )
    .select("id", "email");
  const personneIdByEmail = new Map<string, number>(personneRows.map((p) => [p.email, p.id]));
  const personneFixtureByEmail = new Map(SEED_PERSONNES.map((p) => [p.email, p]));

  return { person, devCap, personneIdByEmail, personneFixtureByEmail };
}
