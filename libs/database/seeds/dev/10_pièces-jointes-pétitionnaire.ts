import type { Knex } from "knex";

import { stockerNouveauFichier } from "@pitchou/server/database/fichier.ts";

import { SEED_PIÈCES_JOINTES_PÉTITIONNAIRE } from "../fixtures/pieces-jointes-petitionnaire.ts";

function convertStringIntoPDF(titre: string): Buffer {
  const texte = `Piece jointe de seed : ${titre}`
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/[()]/g, "\\$&");

  const flux = `BT /F1 16 Tf 60 780 Td (${texte}) Tj ET`;
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  const header = "%PDF-1.4\n";
  let corps = "";
  const offsets = objets.map((obj, i) => {
    const offset = header.length + corps.length;
    corps += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    return offset;
  });

  const startxref = header.length + corps.length;
  const taille = objets.length + 1;
  let xref = `xref\n0 ${taille}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${taille} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  // latin1 : 1 octet/caractère, donc string.length === byteLength (offsets exacts).
  return Buffer.from(header + corps + xref + trailer, "latin1");
}

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
        { nom, contenu: convertStringIntoPDF(nom), media_type },
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
