import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type * as API_DS from "@pitchou/types/demarche-numerique/apiSchema.ts";

export async function getGroupesInstructeurs(
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  Map<GroupeInstructeurs["name"], { id: GroupeInstructeurs["id"]; instructeurs: Set<string> }>
> {
  const rows = await databaseConnection("groupe_instructeurs")
    .select([
      "groupe_instructeurs.id as id_groupe",
      "groupe_instructeurs.name as group_name",
      "email",
    ])
    .leftJoin("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs": "groupe_instructeurs.id",
    })
    .leftJoin("cap_dossier", {
      "cap_dossier.cap": "edge_cap_dossier__groupe_instructeurs.cap_dossier",
    })
    .leftJoin("personne", { "personne.access_code": "cap_dossier.personne_cap" })
    .where({ demarche_number: demarcheNumber });
  const groupes = new Map();
  for (const { id_groupe, group_name, email } of rows) {
    const groupe = groupes.get(group_name) || { id: id_groupe, instructeurs: new Set() };
    if (email) groupe.instructeurs.add(email);
    groupes.set(group_name, groupe);
  }
  return groupes;
}

export async function createGroupesInstructeurs(
  groupesAPI: API_DS.GroupeInstructeurs[],
  instructeurByEmail: Map<Personne["email"], Partial<Personne>>,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const newGroupesP = databaseConnection("groupe_instructeurs")
    .insert(groupesAPI.map(({ label }) => ({ name: label, demarche_number: demarcheNumber })))
    .returning(["id", "name"]);
  const instructeurs = [...instructeurByEmail.values()];
  await databaseConnection("cap_dossier")
    .insert(instructeurs.map(({ access_code }) => ({ personne_cap: access_code })))
    .onConflict("personne_cap")
    .ignore();
  const capByCodeP = databaseConnection("cap_dossier")
    .select(["cap", "personne_cap"])
    .whereIn(
      // @ts-ignore Access codes are completed before this function is called.
      "personne_cap",
      instructeurs.map(({ access_code }) => access_code),
    )
    .then((caps) => new Map(caps.map(({ cap, personne_cap }) => [personne_cap, cap])));
  const codeByEmail = new Map(instructeurs.map(({ email, access_code }) => [email, access_code]));
  const [newGroupes, capByCode] = await Promise.all([newGroupesP, capByCodeP]);
  const edges = groupesAPI.flatMap(({ label, instructeurs }) => {
    const groupe = newGroupes.find(({ name }) => name === label).id;
    return instructeurs.map(({ email }) => ({
      groupe_instructeurs: groupe,
      cap_dossier: capByCode.get(codeByEmail.get(email)),
    }));
  });
  return databaseConnection("edge_cap_dossier__groupe_instructeurs").insert(edges);
}

export function deleteGroupesInstructeurs(
  ids: GroupeInstructeurs["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("groupe_instructeurs").delete().whereIn("id", ids);
}
