import type { Knex } from "knex";

import { stockerNouveauFichier } from "@pitchou/server/database/fichier.ts";

import { SEED_PIÈCES_JOINTES_PÉTITIONNAIRE } from "../fixtures/pièces-jointes-pétitionnaire.ts";

function placeholderPdf(titre: string): Buffer {
  return Buffer.from(`%PDF-1.4\n% Seed pièce jointe — ${titre}\n%%EOF\n`, "utf8");
}

/**
 * id de seed dossier (9000001…) → number_demarches_simplifiées ("99000001"…),
 * comme dans fixtures/dossiers.ts (préfixe "9").
 */
function dsNumberFromSeedId(seedId: number): string {
  return `9${seedId}`;
}

export async function seed(knex: Knex) {
  await knex.transaction(async (trx) => {
    // Résout chaque id de seed dossier en id DB via number_demarches_simplifiées.
    const seedDossierIds = [...new Set(SEED_PIÈCES_JOINTES_PÉTITIONNAIRE.map((pj) => pj.dossier))];
    const dossierIdMap: Record<number, number> = {};
    for (const seedId of seedDossierIds) {
      const dossier = await trx("dossier")
        .where({ number_demarches_simplifiées: dsNumberFromSeedId(seedId) })
        .first();
      if (dossier) {
        dossierIdMap[seedId] = dossier.id;
      } else {
        console.warn(
          `  ⚠ pièces jointes — dossier de seed ${seedId} (DS ${dsNumberFromSeedId(seedId)}) introuvable, PJ ignorées`,
        );
      }
    }

    let count = 0;
    for (const { dossier: seedDossierId, nom, media_type } of SEED_PIÈCES_JOINTES_PÉTITIONNAIRE) {
      const dossierId = dossierIdMap[seedDossierId];
      if (!dossierId) continue;

      // Idempotence : ne pas ré-uploader si cette (dossier, nom) est déjà liée.
      // Sur un `data-reset` frais le bucket et la DB sont vides ; ce garde-fou
      // n'agit que sur un `just data-seed` relancé sans reset.
      await trx("arête_dossier__fichier_pièces_jointes_pétitionnaire as a")
        .join("fichier as f", "f.id", "a.fichier")
        .where({ "a.dossier": dossierId, "f.nom": nom })
        .delete();

      const { id: fichierId } = await stockerNouveauFichier(
        { nom, contenu: placeholderPdf(nom), media_type },
        trx,
      );

      await trx("arête_dossier__fichier_pièces_jointes_pétitionnaire")
        .insert({ dossier: dossierId, fichier: fichierId })
        .onConflict(["dossier", "fichier"])
        .ignore();

      count++;
    }

    console.log("");
    console.log(`  Seed pièces jointes pétitionnaire OK — ${count} fichiers`);
    console.log("");
  });
}
