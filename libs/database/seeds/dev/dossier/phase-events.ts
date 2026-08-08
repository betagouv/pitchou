import type { Knex } from "knex";

import { SEED_EVENEMENTS_PHASE_DOSSIER } from "../../fixtures/dossiers.ts";

export async function seedPhaseEvents(
  transaction: Knex.Transaction,
  dossierIdMap: Record<string, number>,
) {
  for (const { dossier: dsNumber, ...evtData } of SEED_EVENEMENTS_PHASE_DOSSIER) {
    const dossierId = dossierIdMap[dsNumber];
    if (!dossierId) {
      console.warn(`  ⚠ évènement phase "${evtData.phase}" — dossier DS ${dsNumber} non résolu`);
      continue;
    }

    try {
      const existing = await transaction("evenement_phase_dossier")
        .where({ dossier: dossierId, phase: evtData.phase })
        .first();

      if (!existing) {
        await transaction("evenement_phase_dossier").insert({ ...evtData, dossier: dossierId });
      }
    } catch (err) {
      console.error(
        `\n  ✗ Erreur insertion évènement phase "${evtData.phase}" (dossier DB id ${dossierId})`,
      );
      throw err;
    }
  }
}
