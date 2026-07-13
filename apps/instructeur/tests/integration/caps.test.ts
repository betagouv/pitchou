import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("GET /caps?secret=<codeAcces> renvoie les capabilities de l'instructeur", async () => {
  const { codeAcces, email } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
  });

  const res = await fetch(`${INTEGRATION_BASE_URL}/caps?secret=${codeAcces}`);

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.identité).toEqual({
    email,
    estAdmin: false,
    groupesInstructeurs: ["Groupe de test"],
  });
  expect(body).toHaveProperty("listerDossiers");
});

test("GET /caps sans paramètre secret renvoie 400", async () => {
  const res = await fetch(`${INTEGRATION_BASE_URL}/caps`);
  expect(res.status).toBe(400);
});

test("GET /caps avec un secret inconnu renvoie 403", async () => {
  const res = await fetch(`${INTEGRATION_BASE_URL}/caps?secret=inconnu`);
  expect(res.status).toBe(403);
});
