import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

// Everything an instructeur does in the Contrôle tab has to appear in the dossier
// historique: until now only the creation of a décision or of an avis was recorded.

async function setup(email: string) {
  const instructeur = await createInstructeurWithDossier(db, { email });
  const [decision] = await db("decision_administrative")
    .insert({ dossier: instructeur.dossier.id, type: "Arrêté dérogation" })
    .returning(["id"]);
  return { ...instructeur, decision };
}

function post(path: string, cap: string, body: unknown) {
  return fetch(`${INTEGRATION_BASE_URL}/${path}?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function actionTypes(dossierId: number) {
  return db("action_dossier")
    .where({ dossier: dossierId })
    .orderBy("created_at")
    .then((rows) => rows.map(({ type }) => type));
}

test("le cycle de vie d'une prescription est tracé dans l'historique", async () => {
  const { cap, dossier, decision } = await setup("instr@historique-prescription.fr");

  const created = await post("prescription", cap, {
    decision_administrative: decision.id,
    article_number: "2",
  });
  expect(created.status).toBe(200);
  const { prescriptionId } = await created.json();

  const updated = await post("prescription", cap, {
    id: prescriptionId,
    article_number: "2 bis",
  });
  expect(updated.status).toBe(200);

  const deleted = await fetch(`${INTEGRATION_BASE_URL}/prescription/${prescriptionId}?cap=${cap}`, {
    method: "DELETE",
  });
  expect(deleted.status).toBe(204);

  // The décision was inserted directly in the database, so it has no entry here.
  await expect(actionTypes(dossier.id)).resolves.toEqual([
    "prescription_ajoutee",
    "prescription_modifiee",
    "prescription_supprimee",
  ]);
});

test("un contrôle conforme après un non conforme est tracé comme retour à la conformité", async () => {
  const { cap, dossier, decision } = await setup("instr@historique-controle.fr");
  const created = await post("prescription", cap, {
    decision_administrative: decision.id,
    article_number: "3",
  });
  const { prescriptionId } = await created.json();

  const nonConforme = await post("controle", cap, {
    prescription: prescriptionId,
    result: "Non conforme",
  });
  expect(nonConforme.status).toBe(200);

  const conforme = await post("controle", cap, {
    prescription: prescriptionId,
    result: "Conforme",
  });
  expect(conforme.status).toBe(200);

  const types = await actionTypes(dossier.id);
  expect(types.filter((type) => type.startsWith("controle"))).toEqual([
    "controle_ajoute",
    "controle_ajoute",
    "controle_retour_conformite",
  ]);
});

test("un premier contrôle conforme n'est pas un retour à la conformité", async () => {
  const { cap, dossier, decision } = await setup("instr@historique-conforme.fr");
  const created = await post("prescription", cap, {
    decision_administrative: decision.id,
    article_number: "4",
  });

  const { prescriptionId } = await created.json();
  const conforme = await post("controle", cap, {
    prescription: prescriptionId,
    result: "Conforme",
  });
  expect(conforme.status).toBe(200);

  const types = await actionTypes(dossier.id);
  expect(types).not.toContain("controle_retour_conformite");
});

test("supprimer une décision administrative est tracé", async () => {
  const { cap, dossier, decision } = await setup("instr@historique-decision.fr");

  const deleted = await fetch(
    `${INTEGRATION_BASE_URL}/decision-administrative/${decision.id}?cap=${cap}`,
    { method: "DELETE" },
  );
  expect(deleted.status).toBe(204);

  await expect(actionTypes(dossier.id)).resolves.toContain("decision_supprimee");
});
