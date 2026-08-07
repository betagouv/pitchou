import type { Knex } from "knex";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export type GroupeMember = {
  id: Personne["id"];
  email: NonNullable<Personne["email"]>;
  firstNames: Personne["first_names"];
  lastName: Personne["last_name"];
};

export async function getAccessibleDossierGroupeMembers(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
  lockForUpdate = false,
): Promise<GroupeMember[] | undefined> {
  const dossierGroupe = await databaseConnection("edge_groupe_instructeurs__dossier")
    .select("edge_groupe_instructeurs__dossier.groupe_instructeurs")
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({
      "edge_groupe_instructeurs__dossier.dossier": dossierId,
      "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap,
    })
    .first();
  if (!dossierGroupe) return undefined;
  if (lockForUpdate) {
    const memberships = await databaseConnection("edge_cap_dossier__groupe_instructeurs")
      .select("cap_dossier")
      .where({ groupe_instructeurs: dossierGroupe.groupe_instructeurs })
      .orderBy("cap_dossier")
      .forUpdate();
    if (!memberships.some(({ cap_dossier }) => cap_dossier === cap)) return undefined;
    const lockedGroupe = await databaseConnection("edge_groupe_instructeurs__dossier")
      .select("groupe_instructeurs")
      .where({ dossier: dossierId })
      .forUpdate()
      .first();
    if (lockedGroupe?.groupe_instructeurs !== dossierGroupe.groupe_instructeurs) return undefined;
  }
  return databaseConnection("edge_cap_dossier__groupe_instructeurs")
    .distinct([
      "personne.id",
      "personne.email",
      "personne.first_names as firstNames",
      "personne.last_name as lastName",
    ])
    .join("cap_dossier", { "cap_dossier.cap": "edge_cap_dossier__groupe_instructeurs.cap_dossier" })
    .join("personne", { "personne.access_code": "cap_dossier.personne_cap" })
    .where({
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        dossierGroupe.groupe_instructeurs,
    })
    .whereNotNull("personne.email")
    .orderBy("personne.email");
}

export async function followDossierForPersonnes(
  personneIds: Personne["id"][],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  if (!personneIds.length) return;
  await databaseConnection("edge_personne_follows_dossier")
    .insert(personneIds.map((personne) => ({ personne, dossier: dossierId })))
    .onConflict(["personne", "dossier"])
    .ignore();
  await databaseConnection("notification")
    .insert(personneIds.map((personne) => ({ personne, dossier: dossierId, viewed: false })))
    .onConflict(["personne", "dossier"])
    .ignore();
}

export async function unfollowDossierForPersonnes(
  personneIds: Personne["id"][],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  if (!personneIds.length) return;
  await databaseConnection("edge_personne_follows_dossier")
    .delete()
    .where({ dossier: dossierId })
    .whereIn("personne", personneIds);
  await databaseConnection("notification")
    .update({ viewed: true })
    .where({ dossier: dossierId })
    .whereIn("personne", personneIds);
}
