import type { Knex } from "knex";

import { SEED_DOSSIERS } from "../fixtures/dossiers.ts";
import { seedDossierActors } from "./dossier/actors.ts";
import { seedDecisions } from "./dossier/decisions.ts";
import { seedDevFollowers } from "./dossier/dev-followers.ts";
import { seedDossierRows } from "./dossier/rows.ts";
import { seedEspecesImpactees } from "./dossier/especes-impactees.ts";
import { seedExpertAvis } from "./dossier/expert-avis.ts";
import { seedRandomFollowers } from "./dossier/followers.ts";
import { seedPhaseEvents } from "./dossier/phase-events.ts";
import { seedPrescriptionsAndControles } from "./dossier/prescriptions-controles.ts";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    const actors = await seedDossierActors(transaction, SEED_EMAIL);
    const { dossierIdMap, agentVisibleDossiers } = await seedDossierRows(transaction, actors);

    await seedRandomFollowers(transaction, agentVisibleDossiers);
    await seedPhaseEvents(transaction, dossierIdMap);
    await seedExpertAvis(transaction, dossierIdMap);
    await seedDecisions(transaction, dossierIdMap);
    await seedPrescriptionsAndControles(transaction);
    await seedDevFollowers(transaction, actors.person, dossierIdMap);
    await seedEspecesImpactees(transaction, dossierIdMap);

    console.log("");
    console.log(`  Seed dossiers OK — ${SEED_DOSSIERS.length} dossiers`);
    console.log(`  Email : ${SEED_EMAIL}`);
    if (actors.person?.access_code) {
      console.log(`  Login : ${ORIGIN}/?secret=${actors.person.access_code}`);
    }
    console.log("");
  });
}
