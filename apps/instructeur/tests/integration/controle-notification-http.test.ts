import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier, createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

async function createPrescription(dossierId: number): Promise<string> {
  const [decision] = await db("decision_administrative")
    .insert({ dossier: dossierId, type: "Arrêté dérogation" })
    .returning(["id"]);
  const [prescription] = await db("prescription")
    .insert({ decision_administrative: decision.id, description: "Prescription à contrôler" })
    .returning(["id"]);
  return prescription.id;
}

function postControle(cap: string, body: Record<string, unknown>) {
  return fetch(`${INTEGRATION_BASE_URL}/controle?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postNotification(cap: string, body: Record<string, unknown>) {
  return fetch(`${INTEGRATION_BASE_URL}/dossiers/notifications?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("POST /controle accepte le schéma courant", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const prescription = await createPrescription(dossier.id);

  const response = await postControle(cap, {
    prescription,
    controle_date: "2026-07-19T12:00:00.000Z",
    result: "Conforme",
    comment: "Contrôle réalisé",
    post_controle_action_type: "Email",
    post_controle_action_date: "2026-07-20T12:00:00.000Z",
    next_due_date: null,
  });

  expect(response.status).toBe(200);
  await expect(db("controle").where({ prescription })).resolves.toHaveLength(1);
});

test("POST /controle rejette une propriété inconnue sans écriture", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const prescription = await createPrescription(dossier.id);

  const response = await postControle(cap, { prescription, résultat: "Conforme" });

  expect(response.status).toBe(400);
  await expect(db("controle").where({ prescription })).resolves.toHaveLength(0);
});

test("POST /controle rejette un type de propriété incorrect", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const prescription = await createPrescription(dossier.id);

  const response = await postControle(cap, { prescription, result: 42 });

  expect(response.status).toBe(400);
  await expect(db("controle").where({ prescription })).resolves.toHaveLength(0);
});

test("POST /controle interdit de déplacer un contrôle vers un dossier inaccessible", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const sourcePrescription = await createPrescription(dossier.id);
  const inaccessibleDossier = await createDossier(db, { name: "Dossier inaccessible" });
  const destinationPrescription = await createPrescription(inaccessibleDossier.id);
  const [controle] = await db("controle")
    .insert({ prescription: sourcePrescription, result: "En cours" })
    .returning(["id"]);

  const response = await postControle(cap, {
    id: controle.id,
    prescription: destinationPrescription,
  });

  expect(response.status).toBe(403);
  await expect(
    db("controle").select("prescription").where({ id: controle.id }).first(),
  ).resolves.toEqual({ prescription: sourcePrescription });
});

test("POST /dossiers/notifications accepte le schéma courant", async () => {
  const {
    cap,
    id: personne,
    dossier,
  } = await createInstructeurWithDossier(db, {
    email: "instr@test.fr",
  });
  await db("notification").insert({ personne, dossier: dossier.id, viewed: false });

  const response = await postNotification(cap, { dossier: dossier.id, viewed: true });

  expect(response.status).toBe(204);
  await expect(
    db("notification").select("viewed").where({ personne, dossier: dossier.id }).first(),
  ).resolves.toEqual({ viewed: true });
});

test("POST /dossiers/notifications rejette une propriété inconnue sans mise à jour", async () => {
  const {
    cap,
    id: personne,
    dossier,
  } = await createInstructeurWithDossier(db, {
    email: "instr@test.fr",
  });
  await db("notification").insert({ personne, dossier: dossier.id, viewed: false });

  const response = await postNotification(cap, { dossier: dossier.id, viewed: true, vue: true });

  expect(response.status).toBe(400);
  await expect(
    db("notification").select("viewed").where({ personne, dossier: dossier.id }).first(),
  ).resolves.toEqual({ viewed: false });
});

test("POST /dossiers/notifications rejette un type de propriété incorrect", async () => {
  const {
    cap,
    id: personne,
    dossier,
  } = await createInstructeurWithDossier(db, {
    email: "instr@test.fr",
  });
  await db("notification").insert({ personne, dossier: dossier.id, viewed: false });

  const response = await postNotification(cap, { dossier: dossier.id, viewed: "true" });

  expect(response.status).toBe(400);
  await expect(
    db("notification").select("viewed").where({ personne, dossier: dossier.id }).first(),
  ).resolves.toEqual({ viewed: false });
});
