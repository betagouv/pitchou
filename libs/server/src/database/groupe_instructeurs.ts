import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
import {
  createGroupesInstructeurs,
  deleteGroupesInstructeurs,
  getGroupesInstructeurs,
} from "./groupe_instructeurs/groupe_instructeurs_groups.ts";
import {
  addPersonnesToGroupeByEmails,
  createAndReturnInstructeurPersonne,
  deleteNowInaccessibleSuivis,
  deletePersonnesFromGroupeByEmail,
} from "./groupe_instructeurs/groupe_instructeurs_members.ts";
import { createInstructeurCapsAndCompleteInstructeurIds } from "./groupe_instructeurs/groupe_instructeurs_caps.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type * as API_DS from "@pitchou/types/demarche-numerique/apiSchema.ts";

export { deleteNowInaccessibleSuivis };

export async function synchronizeGroupesInstructeurs(
  groupesAPI: API_DS.GroupeInstructeurs[],
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const emails = [
    ...new Set(groupesAPI.flatMap(({ instructeurs }) => instructeurs.map(({ email }) => email))),
  ];
  const instructeurs = await createAndReturnInstructeurPersonne(emails);
  const instructeurByEmail = new Map(
    instructeurs.map((instructeur) => [instructeur.email, instructeur]),
  );
  const groupesDB = await getGroupesInstructeurs(demarcheNumber, databaseConnection);

  const groupesMissing = groupesAPI.filter(({ label }) => !groupesDB.has(label));
  const groupesCreated = groupesMissing.length
    ? createGroupesInstructeurs(
        groupesMissing,
        instructeurByEmail,
        demarcheNumber,
        databaseConnection,
      )
    : Promise.resolve();

  const extraGroupes = [...groupesDB].filter(
    ([name]) => !groupesAPI.some(({ label }) => label === name),
  );
  const groupesDeleted = extraGroupes.length
    ? deleteGroupesInstructeurs(
        extraGroupes.map(([, { id }]) => id),
        databaseConnection,
      )
    : Promise.resolve();

  const membershipsUpdated = Promise.all(
    groupesAPI.map(({ label, instructeurs: groupeInstructeurs }) => {
      const groupe = groupesDB.get(label);
      if (!groupe) return Promise.resolve();
      const emailsToRemove = new Set(groupe.instructeurs);
      const emailsToAdd = new Set<NonNullable<Personne["email"]>>();
      for (const { email } of groupeInstructeurs) {
        if (emailsToRemove.has(email)) emailsToRemove.delete(email);
        else emailsToAdd.add(email);
      }
      return Promise.all([
        emailsToAdd.size
          ? addPersonnesToGroupeByEmails(groupe.id, emailsToAdd, databaseConnection)
          : Promise.resolve(),
        emailsToRemove.size
          ? deletePersonnesFromGroupeByEmail(groupe.id, emailsToRemove, databaseConnection)
          : Promise.resolve(),
      ]);
    }),
  );

  const instructeurEmailToId = new Map<API_DS.Instructeur["email"], API_DS.Instructeur["id"]>();
  for (const groupe of groupesAPI) {
    for (const { email, id } of groupe.instructeurs) instructeurEmailToId.set(email, id);
  }
  const capsCompleted = createInstructeurCapsAndCompleteInstructeurIds(
    instructeurEmailToId,
    demarcheNumber,
    databaseConnection,
  );
  await Promise.all([groupesCreated, groupesDeleted, membershipsUpdated, capsCompleted]);
  return deleteNowInaccessibleSuivis(demarcheNumber, databaseConnection);
}
