import {
  permissionQuery,
  dossiersAccessibleToUser,
} from "../../../libs/server/src/database/dossier/access.ts";
import { recalculateAssignments } from "../../../libs/server/src/dossierRouting.ts";
import { shareDirectAccess } from "../../../libs/server/src/database/dossierDemandes/access.ts";

export async function getReviewer(client, email) {
  const user = await client.trx("auth_user").where({ email, active: true }).first();
  if (
    !user ||
    !(await permissionQuery(user.id, "dossier:instruct", client.trx).first()) ||
    !(await permissionQuery(user.id, "dossier:read", client.trx).first())
  )
    throw new Error("Reviewer must be an existing active local instructeur");
  return user;
}

export async function grantLocalReview(client, demandeKey, dossierId, reviewerId) {
  const sourceKey = `${demandeKey}:local-reviewer:${reviewerId}`;
  const owned = (
    await client.query(
      "SELECT * FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key=$2",
      [demandeKey, sourceKey],
    )
  ).rows[0];
  const current = await client
    .trx("dossier_user_access")
    .where({ dossier: dossierId, user_id: reviewerId })
    .first();
  if (owned) {
    if (
      owned.table_name !== "dossier_user_access" ||
      owned.target_id !== `${dossierId}:${reviewerId}` ||
      current?.access_level !== "instruct"
    )
      throw new Error("Local reviewer grant was changed; reconcile it before importing");
    return;
  }
  if (current && current.access_level !== "instruct")
    throw new Error("Preserve the existing restricted reviewer grant");
  if (!current)
    await client
      .trx("dossier_user_access")
      .insert({ dossier: dossierId, user_id: reviewerId, access_level: "instruct" });
  await client
    .trx("edge_personne_follows_dossier")
    .insert({ dossier: dossierId, personne: reviewerId })
    .onConflict(["dossier", "personne"])
    .ignore();
  await client.query(
    "INSERT INTO onagre_local_import.identity VALUES ($1,$2,'dossier_user_access',$3,$4)",
    [
      demandeKey,
      sourceKey,
      `${dossierId}:${reviewerId}`,
      JSON.stringify({ access_level: "instruct" }),
    ],
  );
}

export async function finalizeRouting(client, dossierIds, reviewer) {
  for (const id of dossierIds) await shareDirectAccess(id, client.trx);
  await recalculateAssignments(client.trx, { dossiers: dossierIds, silent: true });
  const access = await dossiersAccessibleToUser(dossierIds, reviewer.id, client.trx);
  if (dossierIds.some((id) => access.get(id) !== "complet"))
    throw new Error("Reviewer cannot instruct every imported demande");
}
