import type { Knex } from "knex";

export async function createNotification(
  db: Knex,
  args: { personneId: number; dossierId: number; vue?: boolean; date?: Date },
): Promise<void> {
  await db("notification").insert({
    personne: args.personneId,
    dossier: args.dossierId,
    vue: args.vue ?? false,
    date_dernière_mise_à_jour: args.date ?? new Date(),
  });
}

export async function attachPersonneSuitDossier(
  db: Knex,
  personneId: number,
  dossierId: number,
): Promise<void> {
  await db("arête_personne_suit_dossier").insert({
    personne: personneId,
    dossier: dossierId,
  });
}
