import type { Knex } from "knex";
import type { FileId } from "@pitchou/types/database/public/File.js";

import { SEED_DECISIONS_ADMINISTRATIVES } from "../../fixtures/dossiers.ts";

import { stockerPlaceholderPdf } from "./attachments.ts";

export async function seedDecisions(
  transaction: Knex.Transaction,
  dossierIdMap: Record<string, number>,
) {
  for (const { dossier: dsNumber, nom_fichier, ...daData } of SEED_DECISIONS_ADMINISTRATIVES) {
    const dossierId = dossierIdMap[dsNumber];
    if (!dossierId) {
      console.warn(`  ⚠ décision_administrative ${daData.id} — dossier DS ${dsNumber} non résolu`);
      continue;
    }

    try {
      const existing = await transaction("decision_administrative")
        .where({ id: daData.id })
        .first();
      if (!existing) {
        let fichier: FileId | null = null;
        if (nom_fichier) {
          fichier = await stockerPlaceholderPdf(nom_fichier, transaction);
        }
        await transaction("decision_administrative").insert({
          ...daData,
          dossier: dossierId,
          fichier,
        });
      }
    } catch (err) {
      console.error(
        `\n  ✗ Erreur insertion décision_administrative ${daData.id} (dossier DB id ${dossierId})`,
      );
      throw err;
    }
  }
}
