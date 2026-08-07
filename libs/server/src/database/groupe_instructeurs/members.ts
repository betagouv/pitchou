import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export async function createAndReturnInstructeurPersonne(
  emails: NonNullable<Personne["email"]>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<Personne, "id" | "email" | "access_code">[]> {
  await databaseConnection("personne")
    .insert(emails.map((email) => ({ email, access_code: Math.random().toString(36).slice(2) })))
    .onConflict("email")
    .ignore();
  const withoutCode = await databaseConnection("personne")
    .select("*")
    .whereIn("email", emails)
    .where("access_code", null);
  if (withoutCode.length) {
    await databaseConnection("personne")
      .insert(
        withoutCode.map(({ id }) => ({ id, access_code: Math.random().toString(36).slice(2) })),
      )
      .onConflict("id")
      .merge(["access_code"]);
  }
  return databaseConnection("personne")
    .select(["id", "email", "access_code"])
    .whereIn("email", emails);
}

export async function addPersonnesToGroupeByEmails(
  groupe_instructeurs: GroupeInstructeurs["id"],
  emails: Set<NonNullable<Personne["email"]>>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  const missingCaps = await databaseConnection("personne")
    .select("access_code")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.access_code": "cap_dossier.personne_cap" })
    .whereNull("cap");
  if (missingCaps.length) {
    await databaseConnection("cap_dossier")
      .insert(missingCaps.map(({ access_code }) => ({ personne_cap: access_code })))
      .onConflict("personne_cap")
      .ignore();
  }
  const caps = await databaseConnection("personne")
    .select("cap")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.access_code": "cap_dossier.personne_cap" });
  await databaseConnection("edge_cap_dossier__groupe_instructeurs").insert(
    caps.map(({ cap }) => ({ groupe_instructeurs, cap_dossier: cap })),
  );
}

export async function deletePersonnesFromGroupeByEmail(
  groupe_instructeurs: GroupeInstructeurs["id"],
  emails: Set<NonNullable<Personne["email"]>>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  const caps = await databaseConnection("personne")
    .select("cap")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.access_code": "cap_dossier.personne_cap" });
  const memberships = caps.map(({ cap }) => [groupe_instructeurs, cap]);
  await databaseConnection("edge_cap_dossier__groupe_instructeurs")
    .select(["groupe_instructeurs", "cap_dossier"])
    .whereIn(["groupe_instructeurs", "cap_dossier"], memberships)
    .orderBy("cap_dossier")
    .forUpdate();
  await databaseConnection("edge_cap_dossier__groupe_instructeurs")
    .whereIn(["groupe_instructeurs", "cap_dossier"], memberships)
    .delete();
}

export async function deleteNowInaccessibleSuivis(
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("edge_personne_follows_dossier")
    .whereIn(
      "dossier",
      databaseConnection("dossier")
        .select("id")
        .where({ demarche_number: demarcheNumber, source: "demarche_numerique" }),
    )
    .whereNotExists(function () {
      this.select("personne.id")
        .from("personne")
        .join("cap_dossier", "cap_dossier.personne_cap", "personne.access_code")
        .join(
          "edge_cap_dossier__groupe_instructeurs",
          "edge_cap_dossier__groupe_instructeurs.cap_dossier",
          "cap_dossier.cap",
        )
        .join(
          "edge_groupe_instructeurs__dossier",
          "edge_groupe_instructeurs__dossier.groupe_instructeurs",
          "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
        )
        .where("personne.id", databaseConnection.ref("edge_personne_follows_dossier.personne"))
        .where(
          "edge_groupe_instructeurs__dossier.dossier",
          databaseConnection.ref("edge_personne_follows_dossier.dossier"),
        );
    })
    .delete();
}
