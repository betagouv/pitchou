import type { Knex } from "knex";

export async function createDossierSearch(
  db: Knex,
  { personneId, text, date }: { personneId: number; text: string; date?: Date },
): Promise<void> {
  await db("dossier_search").insert({
    personne: personneId,
    text,
    ...(date ? { date } : {}),
  });
}
