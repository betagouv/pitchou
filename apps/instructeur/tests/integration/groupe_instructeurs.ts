import { expect, test } from "vitest";
import { deleteNowInaccessibleSuivis } from "@pitchou/server/database/groupe_instructeurs.ts";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier, DEFAULT_NUMERO_DEMARCHE } from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";

async function countSuivi(personneId: number, dossierId: number): Promise<number> {
  return db("edge_personne_follows_dossier")
    .where({ personne: personneId, dossier: dossierId })
    .then((rows) => rows.length);
}

test("deleteNowInaccessibleSuivis supprime le suivi quand la personne perd l'accès au dossier", async () => {
  const { id: personneId, cap, groupeId, dossier } = await createInstructeurWithDossier(db);
  await attachPersonneSuitDossier(db, personneId, dossier.id);

  await db("edge_cap_dossier__groupe_instructeurs")
    .where({ cap_dossier: cap, groupe_instructeurs: groupeId })
    .delete();

  await deleteNowInaccessibleSuivis(DEFAULT_NUMERO_DEMARCHE, db);

  expect(await countSuivi(personneId, dossier.id)).toBe(0);
});

test("deleteNowInaccessibleSuivis conserve le suivi quand la personne garde l'accès au dossier", async () => {
  const { id: personneId, dossier } = await createInstructeurWithDossier(db);
  await attachPersonneSuitDossier(db, personneId, dossier.id);

  await deleteNowInaccessibleSuivis(DEFAULT_NUMERO_DEMARCHE, db);

  expect(await countSuivi(personneId, dossier.id)).toBe(1);
});
