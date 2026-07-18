import type { Knex } from "knex";

export async function createNotification(
  db: Knex,
  args: { personneId: number; dossierId: number; vue?: boolean; date?: Date },
): Promise<void> {
  await db("notification").insert({
    personne: args.personneId,
    dossier: args.dossierId,
    viewed: args.vue ?? false,
    updated_at: args.date ?? new Date(),
  });
}

export async function attachPersonneSuitDossier(
  db: Knex,
  personneId: number,
  dossierId: number,
): Promise<void> {
  await db("edge_personne_follows_dossier").insert({
    personne: personneId,
    dossier: dossierId,
  });
}
