import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

// Documents are assembled in the browser, so their generation is the one act the
// server cannot observe by itself. The endpoint only takes their names: the type
// of the historique entry is not up to the caller.

function recordDocuments(cap: string, dossierId: number, body: unknown) {
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}/historique?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("les documents générés entrent dans l'historique et comptent comme usage", async () => {
  const {
    cap,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, { email: "instr@documents.fr" });

  const response = await recordDocuments(cap, dossier.id, {
    documents: ["saisine-CSRPN-2026-08-16.odt", "courrier-2026-08-16.odt"],
  });
  expect(response.status).toBe(204);

  const actions = await db("action_dossier").where({ dossier: dossier.id }).orderBy("created_at");
  expect(actions.map(({ type }) => type)).toEqual(["document_genere", "document_genere"]);
  expect(actions[0].data).toEqual({ name: "saisine-CSRPN-2026-08-16.odt" });
  expect(actions[0].author_petitionnaire).toBe(false);

  const metriques = await db("evenement_metrique").where({ personne: personneId });
  expect(metriques.map(({ evenement }) => evenement)).toEqual([
    "générerUnDocument",
    "générerUnDocument",
  ]);
});

test("le nom des documents est obligatoire", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@documents-invalides.fr",
  });

  await expect(recordDocuments(cap, dossier.id, { documents: [] })).resolves.toMatchObject({
    status: 400,
  });
  await expect(recordDocuments(cap, dossier.id, { documents: [""] })).resolves.toMatchObject({
    status: 400,
  });
  // The caller cannot choose which kind of entry it writes.
  await expect(
    recordDocuments(cap, dossier.id, { documents: ["ok.odt"], type: "phase_renseignee" }),
  ).resolves.toMatchObject({ status: 400 });

  await expect(db("action_dossier").where({ dossier: dossier.id })).resolves.toEqual([]);
});
