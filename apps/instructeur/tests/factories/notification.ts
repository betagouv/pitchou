import type { Knex } from "knex";

export async function createNotification(
  db: Knex,
  args: { personneId: number; dossierId: number; vue?: boolean; date?: Date },
): Promise<void> {
  const detectedAt = args.date ?? new Date();
  const [action] = await db("action_dossier")
    .insert({
      dossier: args.dossierId,
      type: "champ_modifie",
      author_petitionnaire: true,
      created_at: detectedAt,
      data: JSON.stringify({ field: "Description", column: "description", notification: true }),
    })
    .returning("id");
  await db("notification")
    .insert({
      personne: args.personneId,
      dossier: args.dossierId,
      viewed: args.vue ?? false,
      updated_at: detectedAt,
      arrival_viewed: true,
      follow_revision: null,
      follow_at: null,
    })
    .onConflict(["dossier", "personne"])
    .merge(["viewed", "updated_at", "arrival_viewed", "follow_revision", "follow_at"]);
  if (args.vue)
    await db("notification_review").insert({ action: action.id, personne: args.personneId });
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
