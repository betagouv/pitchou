import type { Knex } from "knex";

import { SEED_CONTROLES, SEED_PRESCRIPTIONS } from "../../fixtures/dossiers.ts";

export async function seedPrescriptionsAndControles(transaction: Knex.Transaction) {
  for (const prescription of SEED_PRESCRIPTIONS) {
    try {
      const existing = await transaction("prescription").where({ id: prescription.id }).first();
      if (!existing) {
        await transaction("prescription").insert(prescription);
      }
    } catch (err) {
      console.error(
        `\n  ✗ Erreur insertion prescription ${prescription.id} (décision ${prescription.decision_administrative})`,
      );
      throw err;
    }
  }
  for (const controle of SEED_CONTROLES) {
    try {
      const existing = await transaction("controle").where({ id: controle.id }).first();
      if (!existing) {
        await transaction("controle").insert(controle);
      }
    } catch (err) {
      console.error(
        `\n  ✗ Erreur insertion contrôle ${controle.id} (prescription ${controle.prescription})`,
      );
      throw err;
    }
  }
}
