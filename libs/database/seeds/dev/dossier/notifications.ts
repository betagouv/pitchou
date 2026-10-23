import type { Knex } from "knex";

export async function baselineSeedNotifications(trx: Knex.Transaction, dossierIds: number[]) {
  // Deferred queue triggers read these final values when the seed commits.
  await trx("action_dossier")
    .whereIn("dossier", dossierIds)
    .update({
      data: trx.raw("COALESCE(data, '{}'::jsonb) || ?::jsonb", [
        JSON.stringify({ email_notification: false }),
      ]),
    });
  const ownerships = await trx("edge_groupe_instructeurs__dossier")
    .whereIn("dossier", dossierIds)
    .select("dossier", "groupe_instructeurs");
  if (ownerships.length > 0)
    await trx("email_notification_groupe_arrival")
      .insert(ownerships)
      .onConflict("dossier")
      .merge(["groupe_instructeurs"]);
}
