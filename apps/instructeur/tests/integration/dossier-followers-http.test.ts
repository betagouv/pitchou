import { fetchAuthenticated } from "../helpers/auth.ts";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import {
  createGroupeMember,
  listCandidates,
  updateFollowers,
  notificationFor,
} from "./dossier-followers-http.ts";

function follow(cap: string, email: string, dossierId: number, direction = "suivre") {
  return fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/dossiers/relation-suivis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction, personneEmail: email, dossierId }),
  });
}

test("group assignment is available while the personal-follow endpoint stays self-only", async () => {
  const actor = await createInstructeurWithDossier(db, { email: "actor@test.fr" });
  const colleague = await createGroupeMember(actor.groupeId, "colleague@test.fr");
  await attachPersonneSuitDossier(db, colleague.id, actor.dossier.id);
  expect((await listCandidates(actor.cap, actor.dossier.id)).status).toBe(200);
  expect((await updateFollowers(actor.cap, actor.dossier.id, [colleague.email])).status).toBe(204);
  expect((await follow(actor.cap, colleague.email, actor.dossier.id)).status).toBe(403);
  expect(
    await db("edge_personne_follows_dossier").where({ dossier: actor.dossier.id }),
  ).toMatchObject([{ personne: colleague.id }]);
});

test("self-follow, unfollow and refollow retain personal revisions without assigning responsibility", async () => {
  const actor = await createInstructeurWithDossier(db, { email: "self@test.fr" });
  const colleague = await createGroupeMember(actor.groupeId, "colleague@test.fr");
  await attachPersonneSuitDossier(db, colleague.id, actor.dossier.id);
  expect((await follow(actor.cap, actor.email, actor.dossier.id)).status).toBe(204);
  const first = await notificationFor(actor.cap, actor.dossier.id);
  expect(first.new_follow).not.toBeNull();
  expect(first.updated_at).toBeNull();
  const read = await fetchAuthenticated(
    actor.cap,
    `${INTEGRATION_BASE_URL}/dossiers/notifications`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dossier: actor.dossier.id,
        arrival: true,
        followRevision: first.new_follow!.revision,
      }),
    },
  );
  expect(read.status).toBe(200);
  expect((await follow(actor.cap, actor.email, actor.dossier.id, "laisser")).status).toBe(204);
  expect((await follow(actor.cap, actor.email, actor.dossier.id)).status).toBe(204);
  const again = await notificationFor(actor.cap, actor.dossier.id);
  expect(again).toMatchObject({ viewed: false, new_arrival: null, updated_at: null });
  expect(again.new_follow!.revision).not.toBe(first.new_follow!.revision);
  await follow(actor.cap, actor.email, actor.dossier.id);
  expect((await notificationFor(actor.cap, actor.dossier.id)).new_follow).toEqual(again.new_follow);
  expect(
    await db("edge_personne_follows_dossier").where({
      dossier: actor.dossier.id,
      personne: colleague.id,
    }),
  ).toHaveLength(1);
  expect(
    await db("email_notification_outbox").where({ dossier: actor.dossier.id, kind: "assignment" }),
  ).toHaveLength(0);
});

test("concurrent self-follows are idempotent and leave a single audit transition", async () => {
  const actor = await createInstructeurWithDossier(db, { email: "self@test.fr" });
  const responses = await Promise.all([
    follow(actor.cap, actor.email, actor.dossier.id),
    follow(actor.cap, actor.email, actor.dossier.id),
  ]);
  expect(responses.map(({ status }) => status)).toEqual([204, 204]);
  expect(
    await db("edge_personne_follows_dossier").where({
      dossier: actor.dossier.id,
      personne: actor.id,
    }),
  ).toHaveLength(1);
  expect(
    await db("action_dossier").where({ dossier: actor.dossier.id, type: "dossier_suivi" }),
  ).toHaveLength(1);
});

test("full read-only access cannot list or replace other people's follows", async () => {
  const actor = await createInstructeurWithDossier(db, { email: "reader@test.fr" });
  const colleague = await createGroupeMember(actor.groupeId, "colleague@test.fr");
  await attachPersonneSuitDossier(db, colleague.id, actor.dossier.id);
  await db("edge_groupe_instructeurs__dossier")
    .where({ dossier: actor.dossier.id })
    .update({ access_level: "read" });
  expect((await listCandidates(actor.cap, actor.dossier.id)).status).toBe(403);
  expect((await updateFollowers(actor.cap, actor.dossier.id, [])).status).toBe(403);
  expect((await follow(actor.cap, actor.email, actor.dossier.id)).status).toBe(204);
  expect(
    await db("edge_personne_follows_dossier").where({
      dossier: actor.dossier.id,
      personne: colleague.id,
    }),
  ).toHaveLength(1);
});
