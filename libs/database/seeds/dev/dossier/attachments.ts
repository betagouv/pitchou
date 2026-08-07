import type { Knex } from "knex";

import { storeNewFichier } from "@pitchou/server/database/fichier.ts";

import { generatePlaceholderPdf } from "../../fixtures/placeholder-pdf.ts";

export async function stockerPlaceholderPdf(name: string, transaction: Knex.Transaction) {
  const stored = await storeNewFichier(
    {
      name,
      content: generatePlaceholderPdf(name),
      media_type: "application/pdf",
    },
    transaction,
  );

  return stored.id ?? null;
}
