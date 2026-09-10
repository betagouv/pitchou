import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import {
  attachCapToGroupe,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
  shareDossierWithGroupe,
} from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import type { DossierNotification } from "@pitchou/types/notification.ts";
import { backfillLegacyReviews } from "../../../../libs/database/migrations/20260906120000_personal-notification-revisions.ts";

function update(cap: string, body: object) {
  return fetch(`${INTEGRATION_BASE_URL}/dossiers/notifications?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function list(cap: string): Promise<DossierNotification[]> {
  const response = await fetch(`${INTEGRATION_BASE_URL}/dossiers/notifications?cap=${cap}`);
  expect(response.status).toBe(200);
  return response.json();
}

test("arrival is personal and visible to service users without followers", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Service propriétaire" });
  const colleague = await createInstructeurWithCapToGroup(db, { nomGroupe: "Service collègue" });
  await attachCapToGroupe(db, colleague.cap, owner.groupeId);
  expect((await list(owner.cap))[0]).toMatchObject({
    viewed: false,
    new_follow: null,
    changes: [],
  });
  expect((await list(colleague.cap))[0].new_arrival).not.toBeNull();
  const response = await update(owner.cap, { dossier: owner.dossier.id, arrival: true });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ viewed: true, new_arrival: null });
  expect((await list(colleague.cap))[0].new_arrival).not.toBeNull();
});

test("follow, assigned follow and refollow notify only the followed person, without cancelling arrival", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Service propriétaire" });
  const colleague = await createInstructeurWithCapToGroup(db, { nomGroupe: "Service collègue" });
  await attachCapToGroupe(db, colleague.cap, owner.groupeId);
  const edge = { dossier: owner.dossier.id, personne: colleague.id };
  await db("edge_personne_follows_dossier").insert(edge);
  const followed = (await list(colleague.cap))[0];
  expect(followed.new_arrival).not.toBeNull();
  expect(followed.new_follow).not.toBeNull();
  expect((await list(owner.cap))[0].new_follow).toBeNull();
  await db("edge_personne_follows_dossier")
    .insert(edge)
    .onConflict(["personne", "dossier"])
    .ignore();
  expect((await list(colleague.cap))[0].new_follow?.revision).toBe(followed.new_follow?.revision);
  await db("edge_personne_follows_dossier").where(edge).delete();
  await db("edge_personne_follows_dossier").insert(edge);
  const refollowed = (await list(colleague.cap))[0];
  expect(refollowed.new_follow?.revision).not.toBe(followed.new_follow?.revision);
  await update(colleague.cap, {
    dossier: owner.dossier.id,
    followRevision: followed.new_follow!.revision,
  });
  expect((await list(colleague.cap))[0].new_follow?.revision).toBe(refollowed.new_follow?.revision);
});

test("field acknowledgment is personal, revision-bound and independent of arrival dismissal", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Service propriétaire" });
  const colleague = await createInstructeurWithCapToGroup(db, { nomGroupe: "Service collègue" });
  await attachCapToGroupe(db, colleague.cap, owner.groupeId);
  const action = {
    dossier: owner.dossier.id,
    type: "champ_modifie",
    author_petitionnaire: true,
    data: JSON.stringify({ field: "Description", column: "description", notification: true }),
  };
  const [first] = await db("action_dossier").insert(action).returning("id");
  await update(owner.cap, { dossier: owner.dossier.id, arrival: true });
  expect((await list(owner.cap))[0].viewed).toBe(false);
  const [later] = await db("action_dossier").insert(action).returning("id");
  await update(owner.cap, { dossier: owner.dossier.id, revisions: [first.id] });
  const pending = (await list(owner.cap))[0];
  expect(pending.changes[0].revisions).toEqual([later.id]);
  expect(pending.changes[0].modified_at).toBeNull();
  expect((await list(colleague.cap))[0].changes[0].revisions).toHaveLength(2);
  await update(owner.cap, { dossier: owner.dossier.id, revisions: [later.id] });
  expect((await list(owner.cap))[0]).toMatchObject({ viewed: true, changes: [] });
  expect(await db("action_dossier").where("dossier", owner.dossier.id)).toHaveLength(2);
});

test("legacy dossiers and baseline actions do not become new", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);
  await db("notification_arrival").where("dossier", dossier.id).delete();
  await db("action_dossier").insert({
    dossier: dossier.id,
    type: "piece_jointe_importee",
    author_petitionnaire: true,
    data: JSON.stringify({ field: "piece:baseline", baseline: true }),
  });
  expect((await list(cap))[0]).toMatchObject({ viewed: true, new_arrival: null, changes: [] });
});

test("read-only and unrelated users cannot access or change review state", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Service propriétaire" });
  const reader = await createInstructeurWithCapToGroup(db, { nomGroupe: "Service lecteur" });
  await shareDossierWithGroupe(db, owner.dossier.id, reader.groupeId);
  expect(await list(reader.cap)).toEqual([]);
  expect((await update(reader.cap, { dossier: owner.dossier.id, arrival: true })).status).toBe(403);
  const outsider = await createInstructeurWithCapToGroup(db, { nomGroupe: "Service extérieur" });
  expect((await update(outsider.cap, { dossier: owner.dossier.id, arrival: true })).status).toBe(
    403,
  );
});

test("the endpoint rejects manual read/unread and client-supplied personal identities", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);
  for (const body of [
    { dossier: dossier.id, viewed: true },
    { dossier: dossier.id, viewed: false },
    { dossier: dossier.id, arrival: true, personne: 1 },
    { dossier: dossier.id, revisions: ["latest"] },
  ]) {
    expect((await update(cap, body)).status).toBe(400);
  }
});

test("migration retains personal read boundaries and does not give new recipients the legacy backlog", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Service propriétaire" });
  const unread = await createInstructeurWithCapToGroup(db, { nomGroupe: "Service non lu" });
  const readWithoutDate = await createInstructeurWithCapToGroup(db, { nomGroupe: "Service lu" });
  const newcomer = await createInstructeurWithCapToGroup(db, { nomGroupe: "Nouveau service" });
  for (const member of [unread, readWithoutDate, newcomer])
    await attachCapToGroupe(db, member.cap, owner.groupeId);
  // This dossier predates rollout; only the fixture's insert trigger created an arrival.
  await db("notification_arrival").where("dossier", owner.dossier.id).delete();
  const readAt = new Date("2026-08-10T12:00:00Z");
  await db("notification").insert([
    { dossier: owner.dossier.id, personne: owner.id, viewed: false, viewed_at: readAt },
    { dossier: owner.dossier.id, personne: unread.id, viewed: false, viewed_at: null },
    { dossier: owner.dossier.id, personne: readWithoutDate.id, viewed: true, viewed_at: null },
  ]);
  const [consumed, pending] = await db("action_dossier")
    .insert([
      {
        dossier: owner.dossier.id,
        type: "champ_modifie",
        author_petitionnaire: true,
        data: JSON.stringify({ field: "Description" }),
        created_at: readAt,
      },
      {
        dossier: owner.dossier.id,
        type: "champ_modifie",
        author_petitionnaire: true,
        data: JSON.stringify({ field: "Description" }),
        created_at: new Date("2026-08-11T12:00:00Z"),
      },
    ])
    .returning("id");
  await db("action_dossier").insert({
    dossier: owner.dossier.id,
    type: "piece_jointe_importee",
    author_petitionnaire: true,
    data: JSON.stringify({ name: "initial.pdf" }),
  });
  await backfillLegacyReviews(db);
  expect((await list(owner.cap))[0].changes[0].revisions).toEqual([pending.id]);
  expect((await list(unread.cap))[0].changes[0].revisions.sort()).toEqual(
    [consumed.id, pending.id].sort(),
  );
  expect((await list(readWithoutDate.cap))[0]).toMatchObject({ viewed: true, changes: [] });
  expect((await list(newcomer.cap))[0]).toMatchObject({ viewed: true, changes: [] });
  await db("edge_personne_follows_dossier").insert({
    dossier: owner.dossier.id,
    personne: newcomer.id,
  });
  const followed = (await list(newcomer.cap))[0];
  expect(followed.new_follow).not.toBeNull();
  expect(followed.changes).toEqual([]);
  // A read after migration still must not consume pending field revisions.
  await update(owner.cap, { dossier: owner.dossier.id, arrival: true });
  expect((await list(owner.cap))[0].changes[0].revisions).toEqual([pending.id]);
  const [modern] = await db("action_dossier")
    .insert({
      dossier: owner.dossier.id,
      type: "champ_modifie",
      author_petitionnaire: true,
      data: JSON.stringify({ field: "Description", notification: true }),
    })
    .returning("id");
  expect((await list(newcomer.cap))[0].changes[0].revisions).toEqual([modern.id]);
  expect(await db("action_dossier").where("dossier", owner.dossier.id)).toHaveLength(4);
});
