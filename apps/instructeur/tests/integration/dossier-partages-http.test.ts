import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import {
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
  shareDossierWithGroupe,
} from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierPartageCandidate } from "@pitchou/types/capabilities.ts";

function partagesURL(dossierId: number, cap: string) {
  return `${INTEGRATION_BASE_URL}/dossier/${dossierId}/partages?cap=${cap}`;
}

function setPartages(dossierId: number, cap: string, groupeIds: string[]) {
  return fetch(partagesURL(dossierId, cap), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupeIds }),
  });
}

test("GET /dossier/:id/partages liste les autres services de la démarche", async () => {
  const { cap, dossier, groupeId } = await createInstructeurWithDossier(db, {
    email: "instructeur@proprietaire.fr",
    nomGroupe: "Service propriétaire",
  });
  const autre = await createGroupeInstructeurs(db, { name: "Autre service" });
  const dejaPartage = await createGroupeInstructeurs(db, { name: "Service déjà destinataire" });
  await shareDossierWithGroupe(db, dossier.id, dejaPartage.id);

  const response = await fetch(partagesURL(dossier.id, cap));
  expect(response.status).toBe(200);

  const candidates: DossierPartageCandidate[] = await response.json();
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  // The instructing groupe is not a candidate: a service does not share with itself.
  expect(byId.has(groupeId)).toBe(false);
  expect(byId.get(autre.id)?.sharesDossier).toBe(false);
  expect(byId.get(dejaPartage.id)?.sharesDossier).toBe(true);
});

test("POST /dossier/:id/partages partage puis retire le partage", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instructeur@partage.fr",
  });
  const invite = await createGroupeInstructeurs(db, { name: "Service invité" });

  expect((await setPartages(dossier.id, cap, [invite.id])).status).toBe(204);
  await expect(
    db("edge_groupe_instructeurs__dossier_lecture").where({ dossier: dossier.id }),
  ).resolves.toHaveLength(1);

  // An empty list removes every share.
  expect((await setPartages(dossier.id, cap, [])).status).toBe(204);
  await expect(
    db("edge_groupe_instructeurs__dossier_lecture").where({ dossier: dossier.id }),
  ).resolves.toHaveLength(0);
});

test("partager un dossier le rend consultable en lecture seule par l'autre service", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instructeur@partage-bout-en-bout.fr",
  });
  await db("commentaire").insert({
    dossier: dossier.id,
    personne: null,
    content: "Commentaire interne",
    created_at: new Date(),
  });

  const { cap: capInvite, groupeId: groupeInvite } = await createInstructeurWithCapToGroup(db, {
    email: "instructeur@invite.fr",
    nomGroupe: "Service invité",
  });

  // Before sharing, the invited service cannot reach the dossier at all.
  expect(
    (await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossier.id}?cap=${capInvite}`)).status,
  ).toBe(403);

  expect((await setPartages(dossier.id, cap, [groupeInvite])).status).toBe(204);

  const response = await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossier.id}?cap=${capInvite}`);
  expect(response.status).toBe(200);
  const shared: DossierFull = await response.json();
  expect(shared.access).toBe("lecture");
  expect(shared.latestCommentaire).toBeNull();

  // And removing the share takes the access away again.
  expect((await setPartages(dossier.id, cap, [])).status).toBe(204);
  expect(
    (await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossier.id}?cap=${capInvite}`)).status,
  ).toBe(403);
});

test("le partage est tracé dans l'historique du dossier", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instructeur@historique-partage.fr",
  });
  const invite = await createGroupeInstructeurs(db, { name: "Service invité" });

  await setPartages(dossier.id, cap, [invite.id]);
  await setPartages(dossier.id, cap, []);

  const actions = await db("action_dossier").where({ dossier: dossier.id }).orderBy("created_at");
  expect(actions.map(({ type }) => type)).toEqual(["dossier_partage", "dossier_partage_termine"]);
  expect(actions[0]!.data).toMatchObject({ groupe: "Service invité" });
});

test("un service destinataire ne peut pas repartager le dossier", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instructeur@proprietaire-repartage.fr",
  });
  const { cap: capInvite, groupeId: groupeInvite } = await createInstructeurWithCapToGroup(db, {
    email: "instructeur@invite-repartage.fr",
    nomGroupe: "Service invité",
  });
  const tiers = await createGroupeInstructeurs(db, { name: "Service tiers" });
  await setPartages(dossier.id, cap, [groupeInvite]);

  // Sharing is the instructing service's call, not the recipient's.
  expect((await fetch(partagesURL(dossier.id, capInvite))).status).toBe(403);
  expect((await setPartages(dossier.id, capInvite, [tiers.id])).status).toBe(403);
  await expect(
    db("edge_groupe_instructeurs__dossier_lecture").where({ dossier: dossier.id }),
  ).resolves.toHaveLength(1);
});

test("un dossier créé dans Pitchou, sans demarche_number, reste partageable", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instructeur@dossier-pitchou.fr",
  });
  const invite = await createGroupeInstructeurs(db, { name: "Service invité" });
  // A dossier created directly in Pitchou has no démarche: the candidates come
  // from the groupe instructing it, not from the dossier.
  await db("dossier").where({ id: dossier.id }).update({ demarche_number: null });

  const candidates: DossierPartageCandidate[] = await (
    await fetch(partagesURL(dossier.id, cap))
  ).json();
  expect(candidates.map(({ id }) => id)).toContain(invite.id);

  expect((await setPartages(dossier.id, cap, [invite.id])).status).toBe(204);
  await expect(
    db("edge_groupe_instructeurs__dossier_lecture").where({ dossier: dossier.id }),
  ).resolves.toHaveLength(1);
});

test("POST /dossier/:id/partages refuse un groupe qui n'est pas candidat", async () => {
  const { cap, dossier, groupeId } = await createInstructeurWithDossier(db, {
    email: "instructeur@partage-invalide.fr",
  });
  const autreDemarche = await createGroupeInstructeurs(db, {
    name: "Service d'une autre démarche",
    demarche_number: 12345,
  });

  // The instructing groupe itself, and a groupe of another démarche.
  expect((await setPartages(dossier.id, cap, [groupeId])).status).toBe(403);
  expect((await setPartages(dossier.id, cap, [autreDemarche.id])).status).toBe(403);
  await expect(
    db("edge_groupe_instructeurs__dossier_lecture").where({ dossier: dossier.id }),
  ).resolves.toHaveLength(0);
});
