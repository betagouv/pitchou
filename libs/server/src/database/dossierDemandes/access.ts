import type { Knex } from "knex";
import { sharedDossierIds } from "../../dossierRouting/projet.ts";

/** Keep explicit user grants on every member, including newly linked demandes. */
export async function shareDirectAccess(dossierId: number, trx: Knex.Transaction) {
  const members = await sharedDossierIds(trx, [dossierId]);
  const grants = await trx("dossier_user_access")
    .whereIn("dossier", members)
    .select("user_id")
    .select(
      trx.raw(
        "CASE WHEN bool_or(access_level = 'instruct') THEN 'instruct' ELSE 'read' END AS access_level",
      ),
    )
    .groupBy("user_id");
  if (grants.length > 0)
    await trx("dossier_user_access")
      .insert(members.flatMap((dossier) => grants.map((grant) => ({ ...grant, dossier }))))
      .onConflict(["dossier", "user_id"])
      .merge();
}
