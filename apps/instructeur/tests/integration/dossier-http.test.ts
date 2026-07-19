import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

function updateDossier(cap: string, dossierId: number, body: Record<string, unknown>) {
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function phaseEvent(dossier: number, timestamp: string) {
  return {
    dossier,
    phase: "Instruction",
    timestamp,
    caused_by_personne: null,
    demarche_numerique_agent_email: null,
    demarche_numerique_motivation: null,
  };
}

test("POST /dossier/:id met à jour le dossier et sa phase", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const timestamp = "2026-07-19T12:00:00.000Z";

  const response = await updateDossier(cap, dossier.id, {
    free_comment: "À instruire en priorité",
    evenementsPhase: [phaseEvent(dossier.id, timestamp)],
  });

  expect(response.status).toBe(200);
  await expect(
    db("dossier").select("free_comment").where({ id: dossier.id }).first(),
  ).resolves.toEqual({ free_comment: "À instruire en priorité" });
  await expect(db("evenement_phase_dossier").where({ dossier: dossier.id })).resolves.toHaveLength(
    1,
  );
});

test("POST /dossier/:id rejette une propriété inconnue sans écriture partielle", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const response = await updateDossier(cap, dossier.id, {
    evenementsPhase: [phaseEvent(dossier.id, "2026-07-19T12:00:00.000Z")],
    unknown_property: true,
  });

  expect(response.status).toBe(400);
  await expect(db("evenement_phase_dossier").where({ dossier: dossier.id })).resolves.toHaveLength(
    0,
  );
});

test("POST /dossier/:id annule la mise à jour si l'évènement de phase échoue", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const timestamp = "2026-07-19T12:00:00.000Z";
  const event = phaseEvent(dossier.id, timestamp);
  await db("evenement_phase_dossier").insert(event);

  const response = await updateDossier(cap, dossier.id, {
    free_comment: "Ne doit pas être enregistré",
    evenementsPhase: [event],
  });

  expect(response.status).toBe(500);
  await expect(
    db("dossier").select("free_comment").where({ id: dossier.id }).first(),
  ).resolves.toEqual({ free_comment: "" });
});

test("POST /dossier/:id rejette un évènement destiné à un autre dossier", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const [unrelatedDossier] = await db("dossier")
    .insert({ name: "Dossier inaccessible", demarche_number: 88444, depot_date: new Date() })
    .returning(["id"]);

  const response = await updateDossier(cap, dossier.id, {
    evenementsPhase: [phaseEvent(unrelatedDossier.id, "2026-07-19T12:00:00.000Z")],
  });

  expect(response.status).toBe(400);
  await expect(
    db("evenement_phase_dossier").where({ dossier: unrelatedDossier.id }),
  ).resolves.toHaveLength(0);
});
