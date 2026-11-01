import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import {
  createCapDossier,
  createDossier,
  createFichierS3,
  createInstructeurWithDossier,
  createPersonne,
} from "../factories/index.ts";
import { getTestS3 } from "../setup/s3.ts";

function request(cap: string, path: string, method = "GET", body?: object) {
  return fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}${path}`, {
    method,
    ...(body
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

async function directReader() {
  const person = await createPersonne(db, { email: "direct-reader@example.test" });
  const { cap } = await createCapDossier(db, person.codeAcces);
  const dossier = await createDossier(db, { source: "pitchou", demarche_number: null });
  await db("dossier_user_access").insert({
    dossier: dossier.id,
    user_id: person.id,
    access_level: "read",
  });
  await db("email_notification_preferences").where({ personne: person.id }).update({
    assignment: false,
    novelty: false,
    arrival: false,
  });
  return { person, cap, dossier };
}

test("a direct read grant without groups exposes complete information but rejects every tested mutation", async () => {
  const { person, cap, dossier } = await directReader();
  const unrelated = await createDossier(db);
  const file = await createFichierS3(db, await getTestS3(), { name: "internal.pdf" });
  await db("other_attachment").insert({ dossier: dossier.id, fichier: file.id, type: "Autre" });
  await db("commentaire").insert({ dossier: dossier.id, content: "Internal note" });
  await db("action_dossier").insert({
    dossier: dossier.id,
    type: "document_genere",
    data: { name: "Internal history" },
    author_personne: person.id,
  });
  const list = await request(cap, "/dossiers");
  expect(list.status).toBe(200);
  expect((await list.json()).map((d: { id: number }) => d.id)).toEqual([dossier.id]);
  const detail = await request(cap, `/dossier/${dossier.id}`);
  expect(detail.status).toBe(200);
  const payload = await detail.json();
  expect(payload.access).toBe("lecture_complete");
  expect(payload.otherAttachments).toHaveLength(1);
  expect((await request(cap, payload.otherAttachments[0].fichier_url)).status).toBe(200);
  const comments = await request(cap, `/dossier/${dossier.id}/commentaires`);
  expect(comments.status).toBe(200);
  expect(JSON.stringify(await comments.json())).toContain("Internal note");
  const history = await request(cap, `/dossier/${dossier.id}/historique`);
  expect(history.status).toBe(200);
  expect(JSON.stringify(await history.json())).toContain("Internal history");
  expect((await request(cap, `/dossier/${unrelated.id}`)).status).toBe(403);

  for (const [path, body] of [
    [`/dossier/${dossier.id}`, { enjeu: true }],
    [`/dossier/${dossier.id}/commentaires`, { content: "Forbidden comment" }],
    [`/dossier/${dossier.id}/historique`, { documents: ["Forbidden event"] }],
    ["/fichier/upload-url", { dossier: dossier.id, files: [{ size: 10 }] }],
  ] as const) {
    expect((await request(cap, path, "POST", body)).status, path).toBe(403);
  }
  expect(await db("commentaire").where({ dossier: dossier.id })).toHaveLength(1);
  expect(await db("action_dossier").where({ dossier: dossier.id })).toHaveLength(1);
  expect((await db("dossier").where({ id: dossier.id }).first()).enjeu).not.toBe(true);
});

test("direct instruction works without groups and account exclusions cap or revoke it immediately", async () => {
  const { person, cap, dossier } = await directReader();
  await db("dossier_user_access")
    .where({ dossier: dossier.id })
    .update({ access_level: "instruct" });
  expect((await request(cap, `/dossier/${dossier.id}`, "POST", { enjeu: true })).status).toBe(200);
  await db("auth_permission_exclusion").insert({
    user_id: person.id,
    permission: "dossier:instruct",
  });
  expect((await (await request(cap, `/dossier/${dossier.id}`)).json()).access).toBe(
    "lecture_complete",
  );
  expect((await request(cap, `/dossier/${dossier.id}`, "POST", { enjeu: false })).status).toBe(403);
  await db("auth_permission_exclusion").insert({ user_id: person.id, permission: "dossier:read" });
  expect((await request(cap, `/dossier/${dossier.id}`)).status).toBe(403);
});

test("personal follow survives a read downgrade, grants no edit access, and disappears on final revocation", async () => {
  const { person, cap, dossier } = await directReader();
  await db("auth_permission_exclusion").insert({
    user_id: person.id,
    permission: "dossier:instruct",
  });
  const body = { direction: "suivre", personneEmail: person.email, dossierId: dossier.id };
  expect((await request(cap, "/dossiers/relation-suivis", "POST", body)).status).toBe(204);
  expect(
    await db("edge_personne_follows_dossier").where({ personne: person.id, dossier: dossier.id }),
  ).toHaveLength(1);
  expect((await (await request(cap, `/dossier/${dossier.id}`)).json()).access).toBe(
    "lecture_complete",
  );
  await db("dossier_user_access").where({ dossier: dossier.id, user_id: person.id }).delete();
  expect(await db("edge_personne_follows_dossier").where({ personne: person.id })).toHaveLength(0);
  expect((await request(cap, `/dossier/${dossier.id}`)).status).toBe(403);
});

test("excluding one group preserves an independent direct grant and personal tracking", async () => {
  const owner = await createInstructeurWithDossier(db);
  await db("dossier_user_access").insert({
    dossier: owner.dossier.id,
    user_id: owner.id,
    access_level: "read",
  });
  await db("edge_personne_follows_dossier").insert({
    personne: owner.id,
    dossier: owner.dossier.id,
  });
  await db("groupe_dossier_override").insert({
    dossier: owner.dossier.id,
    groupe_instructeurs: owner.groupeId,
    mode: "exclude",
  });
  expect((await (await request(owner.cap, `/dossier/${owner.dossier.id}`)).json()).access).toBe(
    "lecture_complete",
  );
  expect(await db("edge_personne_follows_dossier").where({ personne: owner.id })).toHaveLength(1);
});
