import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3, createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { s3HasKey } from "../helpers/fileStorage.ts";

function remove(cap: string, body: unknown) {
  return fetch(`${INTEGRATION_BASE_URL}/piece-jointe?cap=${cap}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const references = [
  { type: "saisine", table: "avis_expert", column: "saisine_fichier" },
  { type: "avis", table: "avis_expert", column: "avis_fichier" },
  { type: "decision", table: "decision_administrative", column: "fichier" },
  { type: "autre", table: "other_attachment", column: "fichier" },
];

test.each(references)(
  "deletes the $type attachment and audits the deletion",
  async ({ type, table, column }) => {
    const { cap, dossier } = await createInstructeurWithDossier(db);
    const file = await createFichierS3(db, await getTestS3());
    const [entity] = await db(table)
      .insert({
        dossier: dossier.id,
        [column]: file.id,
        ...(type === "autre" ? { type: "Note" } : {}),
      })
      .returning("*");
    const response = await remove(cap, {
      dossier: dossier.id,
      type,
      entityId: entity.id,
      fileId: file.id,
    });
    expect(response.status, await response.text()).toBe(204);
    const remaining = await db(table).where({ id: entity.id }).first();
    if (type === "autre") expect(remaining).toBeUndefined();
    else expect(remaining).toEqual({ ...entity, [column]: null });
    expect(await db("file").where({ id: file.id })).toHaveLength(0);
    await expect.poll(() => s3HasKey(file.key)).toBe(false);
    expect(
      await db("action_dossier")
        .where({ dossier: dossier.id, type: "piece_jointe_supprimee" })
        .first(),
    ).toMatchObject({ data: { name: file.name } });
  },
);

test("preserves a shared project file and refuses deletion of project attachments", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);
  const file = await createFichierS3(db, await getTestS3());
  await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
    dossier: dossier.id,
    fichier: file.id,
  });
  const [decision] = await db("decision_administrative")
    .insert({ dossier: dossier.id, fichier: file.id })
    .returning("id");
  const body = { dossier: dossier.id, type: "decision", entityId: decision.id, fileId: file.id };
  expect((await remove(cap, { ...body, type: "projet" })).status).toBe(400);
  expect((await remove(cap, body)).status).toBe(204);
  expect(await db("file").where({ id: file.id })).toHaveLength(1);
  expect(await s3HasKey(file.key)).toBe(true);
  expect(
    await db("edge_dossier__fichier_pieces_jointes_petitionnaire").where({ dossier: dossier.id }),
  ).toHaveLength(1);
});

test("refuses read-only access, foreign entities and a stale file ID", async () => {
  const owner = await createInstructeurWithDossier(db, {
    email: "owner@pieces.fr",
    nomGroupe: "Owner",
  });
  const viewer = await createInstructeurWithDossier(db, {
    email: "viewer@pieces.fr",
    nomGroupe: "Viewer",
  });
  const file = await createFichierS3(db, await getTestS3());
  const [decision] = await db("decision_administrative")
    .insert({ dossier: owner.dossier.id, fichier: file.id })
    .returning("id");
  const body = {
    dossier: owner.dossier.id,
    type: "decision",
    entityId: decision.id,
    fileId: file.id,
  };
  expect((await remove(viewer.cap, body)).status).toBe(403);
  expect((await remove(viewer.cap, { ...body, dossier: viewer.dossier.id })).status).toBe(404);
  expect((await remove(owner.cap, { ...body, fileId: randomUUID() })).status).toBe(404);
  expect(await db("decision_administrative").where({ id: decision.id }).first()).toMatchObject({
    fichier: file.id,
  });
  expect(await s3HasKey(file.key)).toBe(true);
  expect(await db("action_dossier").where({ type: "piece_jointe_supprimee" })).toHaveLength(0);
});
