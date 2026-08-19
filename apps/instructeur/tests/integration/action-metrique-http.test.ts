import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

// An act of an instructeur must leave exactly one trace on each side: an entry in
// the dossier historique, and one usage metric derived from it server-side. The
// browser no longer reports these events, so a single act can never be counted twice.

function updateDossier(cap: string, dossierId: number, body: Record<string, unknown>) {
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function actionsOf(dossierId: number) {
  return db("action_dossier").where({ dossier: dossierId }).orderBy("created_at");
}

function metriquesOf(personneId: number) {
  return db("evenement_metrique").where({ personne: personneId });
}

test("changer la prochaine action attendue laisse une entrée d'historique et une métrique", async () => {
  const {
    cap,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@action-metrique.fr",
  });

  const response = await updateDossier(cap, dossier.id, {
    next_action_expected_from: "Instructeur",
    next_action_expected: "Envoyer la saisine",
  });
  expect(response.status).toBe(200);

  const actions = await actionsOf(dossier.id);
  expect(actions.map(({ type }) => type)).toEqual([
    "prochaine_action_renseignee",
    "prochaine_action_attendue_renseignee",
  ]);

  const metriques = await metriquesOf(personneId);
  expect(metriques.map(({ evenement }) => evenement).sort()).toEqual([
    "changerProchaineActionAttendue",
    "changerProchaineActionAttendueDe",
  ]);
  // The metric now carries the time of day, not only the day.
  expect(metriques[0].date).toBeInstanceOf(Date);
});

test("un commentaire ajouté puis modifié est tracé des deux côtés", async () => {
  const {
    cap,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@commentaire-metrique.fr",
  });

  const created = await fetch(
    `${INTEGRATION_BASE_URL}/dossier/${dossier.id}/commentaires?cap=${cap}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Premier commentaire" }),
    },
  );
  expect(created.status).toBe(201);
  const { id } = await created.json();

  const edited = await fetch(
    `${INTEGRATION_BASE_URL}/dossier/${dossier.id}/commentaires?cap=${cap}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: "Commentaire corrigé" }),
    },
  );
  expect(edited.status).toBe(204);

  const actions = await actionsOf(dossier.id);
  expect(actions.map(({ type }) => type)).toEqual(["commentaire_ajoute", "commentaire_modifie"]);

  const metriques = await metriquesOf(personneId);
  expect(metriques.map(({ evenement }) => evenement)).toEqual([
    "modifierCommentaireInstruction",
    "modifierCommentaireInstruction",
  ]);
});

test("les actions de la synchronisation ne comptent pas comme usage du produit", async () => {
  const { dossier } = await createInstructeurWithDossier(db, {
    email: "instr@sync-metrique.fr",
  });

  await db("action_dossier").insert({
    dossier: dossier.id,
    type: "champ_modifie",
    data: JSON.stringify({ field: "Description" }),
    author_petitionnaire: true,
  });

  await expect(db("evenement_metrique").count()).resolves.toEqual([{ count: "0" }]);
});
