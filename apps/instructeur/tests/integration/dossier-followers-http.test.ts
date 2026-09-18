import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createInstructeurWithDossier,
  createPersonne,
} from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import {
  createGroupeMember,
  listCandidates,
  updateFollowers,
  notificationFor,
} from "./dossier-followers-http.ts";

test("GET lists every member of the dossier groupe and their follow state", async () => {
  const assigner = await createInstructeurWithDossier(db, { email: "assigner@test.fr" });
  const existingFollower = await createGroupeMember(assigner.groupeId, "existing@test.fr");
  await createGroupeMember(assigner.groupeId, "available@test.fr", {
    first_names: "Camille",
    last_name: "Martin",
  });
  await attachPersonneSuitDossier(db, existingFollower.id, assigner.dossier.id);

  const response = await listCandidates(assigner.cap, assigner.dossier.id);

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual([
    { email: "assigner@test.fr", firstNames: null, lastName: null, followsDossier: false },
    {
      email: "available@test.fr",
      firstNames: "Camille",
      lastName: "Martin",
      followsDossier: false,
    },
    { email: "existing@test.fr", firstNames: null, lastName: null, followsDossier: true },
  ]);
});

test("POST atomically adds and removes dossier followers and creates first-follow notifications", async () => {
  const assigner = await createInstructeurWithDossier(db, { email: "assigner@test.fr" });
  const removed = await createGroupeMember(assigner.groupeId, "removed@test.fr");
  const added = await createGroupeMember(assigner.groupeId, "added@test.fr");
  await attachPersonneSuitDossier(db, removed.id, assigner.dossier.id);

  const response = await updateFollowers(assigner.cap, assigner.dossier.id, [
    assigner.email,
    added.email,
  ]);

  expect(response.status).toBe(204);
  const followers = await db("edge_personne_follows_dossier")
    .join("personne", "personne.id", "edge_personne_follows_dossier.personne")
    .where({ dossier: assigner.dossier.id })
    .orderBy("personne.email")
    .select("personne.email");
  expect(followers).toEqual([{ email: "added@test.fr" }, { email: "assigner@test.fr" }]);

  const notifications = await db("notification")
    .join("personne", "personne.id", "notification.personne")
    .where({ dossier: assigner.dossier.id })
    .orderBy("personne.email")
    .select(["personne.email", "notification.viewed", "notification.follow_revision"]);
  expect(notifications).toEqual([
    { email: "added@test.fr", viewed: false, follow_revision: expect.any(String) },
    { email: "assigner@test.fr", viewed: false, follow_revision: expect.any(String) },
    { email: "removed@test.fr", viewed: false, follow_revision: null },
  ]);
  // Unfollowing clears only the follow notification, not the unseen arrival.
  expect(await notificationFor(removed.cap, assigner.dossier.id)).toMatchObject({
    viewed: false,
    new_follow: null,
    new_arrival: { detected_at: expect.any(String) },
  });
});

test("POST rejects a personne outside the dossier groupe without changing followers", async () => {
  const assigner = await createInstructeurWithDossier(db, { email: "assigner@test.fr" });
  const member = await createGroupeMember(assigner.groupeId, "member@test.fr");
  const outsider = await createPersonne(db, { email: "outsider@test.fr" });
  await attachPersonneSuitDossier(db, member.id, assigner.dossier.id);

  const response = await updateFollowers(assigner.cap, assigner.dossier.id, [outsider.email]);

  expect(response.status).toBe(403);
  await expect(
    db("edge_personne_follows_dossier").where({ dossier: assigner.dossier.id }),
  ).resolves.toMatchObject([{ personne: member.id, dossier: assigner.dossier.id }]);
});

test("refollow creates a new personal revision without changing the applicant modification date", async () => {
  const assigner = await createInstructeurWithDossier(db, { email: "assigner@test.fr" });
  const member = await createGroupeMember(assigner.groupeId, "member@test.fr");

  expect((await updateFollowers(assigner.cap, assigner.dossier.id, [member.email])).status).toBe(
    204,
  );
  const first = await notificationFor(member.cap, assigner.dossier.id);
  expect(first.updated_at).toBeNull();
  expect(first.new_follow).not.toBeNull();
  const read = await fetch(`${INTEGRATION_BASE_URL}/dossiers/notifications?cap=${member.cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dossier: assigner.dossier.id,
      arrival: true,
      followRevision: first.new_follow!.revision,
    }),
  });
  expect(read.status).toBe(200);
  expect(await read.json()).toMatchObject({ viewed: true, new_follow: null, updated_at: null });
  expect((await updateFollowers(assigner.cap, assigner.dossier.id, [])).status).toBe(204);
  expect((await updateFollowers(assigner.cap, assigner.dossier.id, [member.email])).status).toBe(
    204,
  );

  const again = await notificationFor(member.cap, assigner.dossier.id);
  expect(again).toMatchObject({ viewed: false, new_arrival: null, updated_at: null });
  expect(again.new_follow!.revision).not.toBe(first.new_follow!.revision);
  expect(new Date(again.new_follow!.detected_at).getTime()).toBeGreaterThanOrEqual(
    new Date(first.new_follow!.detected_at).getTime(),
  );
  // Saving the same assignment is not another transition.
  await updateFollowers(assigner.cap, assigner.dossier.id, [member.email]);
  expect((await notificationFor(member.cap, assigner.dossier.id)).new_follow).toEqual(
    again.new_follow,
  );
});

test("the self-follow endpoint creates a notification on first follow", async () => {
  const instructeur = await createInstructeurWithDossier(db, { email: "self@test.fr" });

  const response = await fetch(
    `${INTEGRATION_BASE_URL}/dossiers/relation-suivis?cap=${instructeur.cap}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: "suivre",
        personneEmail: instructeur.email,
        dossierId: instructeur.dossier.id,
      }),
    },
  );

  expect(response.status).toBe(204);
  await expect(
    db("notification")
      .select("viewed", "updated_at", "follow_at", "follow_revision")
      .where({ personne: instructeur.id, dossier: instructeur.dossier.id })
      .first(),
  ).resolves.toEqual({
    viewed: false,
    updated_at: null,
    follow_at: expect.any(Date),
    follow_revision: expect.any(String),
  });
});

test("concurrent follower replacements are serialized", async () => {
  const assigner = await createInstructeurWithDossier(db, { email: "assigner@test.fr" });
  const memberOne = await createGroupeMember(assigner.groupeId, "member-one@test.fr");
  const memberTwo = await createGroupeMember(assigner.groupeId, "member-two@test.fr");

  const responses = await Promise.all([
    updateFollowers(assigner.cap, assigner.dossier.id, [memberOne.email]),
    updateFollowers(assigner.cap, assigner.dossier.id, [memberTwo.email]),
  ]);

  expect(responses.map(({ status }) => status)).toEqual([204, 204]);
  const followers = await db("edge_personne_follows_dossier")
    .where({ dossier: assigner.dossier.id })
    .select("personne");
  expect(followers).toHaveLength(1);
  expect([memberOne.id, memberTwo.id]).toContain(followers[0].personne);
});

test("concurrent assignments by different groupe members use a stable lock order", async () => {
  const assignerOne = await createInstructeurWithDossier(db, { email: "assigner-one@test.fr" });
  const assignerTwo = await createGroupeMember(assignerOne.groupeId, "assigner-two@test.fr");
  const dossierTwo = await createDossier(db, { name: "Second dossier" });
  await attachDossierToGroupe(db, dossierTwo.id, assignerOne.groupeId);

  const responses = await Promise.all([
    updateFollowers(assignerOne.cap, assignerOne.dossier.id, [assignerOne.email]),
    updateFollowers(assignerTwo.cap, dossierTwo.id, [assignerTwo.email]),
  ]);

  expect(responses.map(({ status }) => status)).toEqual([204, 204]);
});
