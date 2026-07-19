import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("POST /prescription accepte le schéma courant", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const [decision] = await db("decision_administrative")
    .insert({ dossier: dossier.id, type: "Arrêté dérogation" })
    .returning(["id"]);

  const res = await fetch(`${INTEGRATION_BASE_URL}/prescription?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision_administrative: decision.id,
      due_date: "2027-01-15",
      article_number: "2",
      description: "Maintenir les habitats compensatoires",
      compensated_surface: 1200,
    }),
  });

  expect(res.status).toBe(200);
  const prescriptions = await db("prescription").where({ decision_administrative: decision.id });
  expect(prescriptions).toHaveLength(1);
  expect(prescriptions[0]).toMatchObject({
    article_number: "2",
    description: "Maintenir les habitats compensatoires",
    compensated_surface: 1200,
  });
});

test("POST /prescription rejette un type de propriété incorrect", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const [decision] = await db("decision_administrative")
    .insert({ dossier: dossier.id, type: "Arrêté dérogation" })
    .returning(["id"]);

  const res = await fetch(`${INTEGRATION_BASE_URL}/prescription?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision_administrative: decision.id,
      due_date: "2027-01-15",
      article_number: "2",
      description: "Surface incorrecte",
      compensated_surface: "1200",
    }),
  });

  expect(res.status).toBe(400);
  expect(await db("prescription").where({ decision_administrative: decision.id })).toHaveLength(0);
});
