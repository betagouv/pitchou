import type { Knex } from "knex";

import { storeNewFichier } from "@pitchou/server/database/fichier.ts";

import { SEED_PIECES_JOINTES_PETITIONNAIRE } from "../fixtures/pieces-jointes-petitionnaire.ts";
import { generatePlaceholderPdf } from "../fixtures/placeholder-pdf.ts";

export async function seed(knex: Knex) {
  await knex.transaction(async (trx) => {
    let count = 0;
    for (const {
      dossier: dsNumber,
      name,
      media_type,
      demarche_numerique_created_at,
    } of SEED_PIECES_JOINTES_PETITIONNAIRE) {
      const dossier = await trx("dossier").where({ demarche_numerique_number: dsNumber }).first();

      if (!dossier) {
        console.warn(
          `  ⚠ pièces jointes — dossier DS ${dsNumber} introuvable, PJ "${name}" ignorée`,
        );
        continue;
      }

      const dossierId = dossier.id;

      // Idempotence : ne pas ré-uploader si cette (dossier, nom) est déjà liée.
      // Sur un `data-reset` frais le bucket et la DB sont vides ; ce garde-fou
      // n'agit que sur un `just data-seed` relancé sans reset.
      await trx("edge_dossier__fichier_pieces_jointes_petitionnaire as a")
        .join("file as f", "f.id", "a.fichier")
        .where({ "a.dossier": dossierId, "f.name": name })
        .delete();

      const { id: fichierId } = await storeNewFichier(
        {
          name,
          content: generatePlaceholderPdf(name),
          media_type,
          demarche_numerique_created_at,
        },
        trx,
      );

      await trx("edge_dossier__fichier_pieces_jointes_petitionnaire")
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
