import type { Knex } from "knex";

import { stockerNouveauFichier } from "@pitchou/server/database/fichier.ts";

import { SEED_PIÈCES_JOINTES_PÉTITIONNAIRE } from "../fixtures/pieces-jointes-petitionnaire.ts";
import { generatePlaceholderPdf } from "../fixtures/placeholder-pdf.ts";

export async function seed(knex: Knex) {
  await knex.transaction(async (trx) => {
    let count = 0;
    for (const { dossier: dsNumber, nom, media_type } of SEED_PIÈCES_JOINTES_PÉTITIONNAIRE) {
      const dossier = await trx("dossier")
        .where({ number_demarches_simplifiées: dsNumber })
        .first();

      if (!dossier) {
        console.warn(
          `  ⚠ pièces jointes — dossier DS ${dsNumber} introuvable, PJ "${nom}" ignorée`,
        );
        continue;
      }

      const dossierId = dossier.id;

      // Idempotence : ne pas ré-uploader si cette (dossier, nom) est déjà liée.
      // Sur un `data-reset` frais le bucket et la DB sont vides ; ce garde-fou
      // n'agit que sur un `just data-seed` relancé sans reset.
      await trx("arête_dossier__fichier_pièces_jointes_pétitionnaire as a")
        .join("fichier as f", "f.id", "a.fichier")
        .where({ "a.dossier": dossierId, "f.nom": nom })
        .delete();

      const { id: fichierId } = await stockerNouveauFichier(
        { nom, contenu: generatePlaceholderPdf(nom), media_type },
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
