import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { mutate } from "./commentaires-http.ts";

test("delete validates JSON and IDs and rejects missing, foreign-dossier and migrated comments", async () => {
  const author = await createInstructeurWithDossier(db);
  const other = await createInstructeurWithDossier(db, { nomGroupe: "Foreign dossier service" });
  const [migrated] = await db("commentaire")
    .insert({ dossier: author.dossier.id, personne: null, content: "Initial" })
    .returning("*");
  const [foreign] = await db("commentaire")
    .insert({ dossier: other.dossier.id, personne: author.id, content: "Elsewhere" })
    .returning("*");
  for (const body of [
    null,
    [],
    {},
    { id: 3 },
    { id: "not-a-uuid" },
    { id: migrated.id, personne: author.id },
  ]) {
    expect((await mutate(author.cap, author.dossier.id, body)).status).toBe(400);
  }
  const invalidJson = await fetch(
    `${INTEGRATION_BASE_URL}/dossier/${author.dossier.id}/commentaires?cap=${author.cap}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: "{",
    },
  );
  expect(invalidJson.status).toBe(400);
  for (const id of [randomUUID(), migrated.id, foreign.id]) {
    expect((await mutate(author.cap, author.dossier.id, { id })).status).toBe(403);
  }
  expect((await mutate("invalid-cap", author.dossier.id, { id: migrated.id })).status).toBe(403);
  expect(
    (
      await fetch(`${INTEGRATION_BASE_URL}/dossier/${author.dossier.id}/commentaires`, {
        method: "DELETE",
      })
    ).status,
  ).toBe(400);
  expect(await db("action_dossier")).toEqual([]);
  expect(await db("commentaire").where({ dossier: author.dossier.id })).toEqual([migrated]);
  expect(await db("commentaire").where({ dossier: other.dossier.id })).toEqual([foreign]);
});
