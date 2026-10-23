import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("the session exposes identity and ordinary API URLs without credentials", async () => {
  const { cap, email } = await createInstructeurWithCapToGroup(db, { email: "jane@doe.fr" });
  const response = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/api/session`);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.identité).toEqual({
    email,
    estAdmin: false,
    groupesInstructeurs: ["Groupe de test"],
  });
  expect(body.listerDossiers).toBe("/dossiers");
  expect(body.listDossierFollowerCandidates).toBe("/dossier/:dossierId/followers");
  expect(body.creerEvenementMetrique).toBe("/api/metriques/evenements");
  expect(JSON.stringify(body)).not.toContain(cap);
});

test("a legacy capability URL cannot authenticate a request", async () => {
  const { cap, codeAcces } = await createInstructeurWithCapToGroup(db);
  expect((await fetch(`${INTEGRATION_BASE_URL}/dossiers?cap=${cap}`)).status).toBe(401);
  expect((await fetch(`${INTEGRATION_BASE_URL}/caps?secret=${codeAcces}`)).status).toBe(401);
  expect((await fetch(`${INTEGRATION_BASE_URL}/api/session`)).status).toBe(401);
});
