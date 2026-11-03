import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  attachCapToGroupe,
  createCapDossier,
  createDossier,
  createInstructeurWithCapToGroup,
  createPersonne,
} from "../factories/index.ts";
import { changeArrivalEdges } from "../helpers/routing.ts";

export async function setupArrival() {
  const member = await createInstructeurWithCapToGroup(db, {
    email: "member@test.fr",
    nomGroupe: "Arrival group",
  });
  const colleague = await createPersonne(db, { email: "colleague@test.fr" });
  const { cap } = await createCapDossier(db, colleague.codeAcces);
  await attachCapToGroupe(db, cap, member.groupeId);
  const outsider = await createInstructeurWithCapToGroup(db, {
    email: "outsider@test.fr",
    nomGroupe: "Other group",
  });
  const dossier = await createDossier(db, {
    name: "Nouveau projet",
    demarche_numerique_number: "123456",
  });
  const arrive = () =>
    changeArrivalEdges(db, (trx) =>
      trx("edge_groupe_instructeurs__dossier").insert({
        dossier: dossier.id,
        groupe_instructeurs: member.groupeId,
      }),
    );
  return { member, colleague, outsider, dossier, arrive };
}
