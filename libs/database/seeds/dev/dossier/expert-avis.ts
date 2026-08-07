import type { Knex } from "knex";
import type { FileId } from "@pitchou/types/database/public/File.js";

import { SEED_AVIS_EXPERTS } from "../../fixtures/dossiers.ts";

import { stockerPlaceholderPdf } from "./attachments.ts";

export async function seedExpertAvis(
  transaction: Knex.Transaction,
  dossierIdMap: Record<string, number>,
) {
  for (const {
    dossier: dsNumber,
    nom_fichier_saisine,
    nom_fichier_avis,
    ...avisData
  } of SEED_AVIS_EXPERTS) {
    const dossierId = dossierIdMap[dsNumber];
    if (!dossierId) {
      console.warn(`  ⚠ avis_expert ${avisData.id} — dossier DS ${dsNumber} non résolu`);
      continue;
    }

    try {
      const existing = await transaction("avis_expert").where({ id: avisData.id }).first();
      if (!existing) {
        await transaction("avis_expert").insert({
          ...avisData,
          dossier: dossierId,
          saisine_fichier: nom_fichier_saisine
            ? await stockerPlaceholderPdf(nom_fichier_saisine, transaction)
            : null,
          avis_fichier: nom_fichier_avis
            ? await stockerPlaceholderPdf(nom_fichier_avis, transaction)
            : null,
        });
      } else {
        const fichiersAAjouter: {
          saisine_fichier?: FileId | null;
          avis_fichier?: FileId | null;
        } = {};

        if (nom_fichier_saisine && !existing.saisine_fichier) {
          fichiersAAjouter.saisine_fichier = await stockerPlaceholderPdf(
            nom_fichier_saisine,
            transaction,
          );
        }

        if (nom_fichier_avis && !existing.avis_fichier) {
          fichiersAAjouter.avis_fichier = await stockerPlaceholderPdf(
            nom_fichier_avis,
            transaction,
          );
        }

        if (Object.keys(fichiersAAjouter).length >= 1) {
          await transaction("avis_expert").where({ id: avisData.id }).update(fichiersAAjouter);
        }
      }
    } catch (err) {
      console.error(
        `\n  ✗ Erreur insertion avis_expert ${avisData.id} (dossier DB id ${dossierId})`,
      );
      throw err;
    }
  }
}
