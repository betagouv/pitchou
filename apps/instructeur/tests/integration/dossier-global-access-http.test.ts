import { fetchAuthenticated, sessionUserId } from "../helpers/auth.ts";
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import type { DossierFull, DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { db } from "../setup/db.ts";
import {
  attachCapToGroupe,
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { listCandidates, updateFollowers } from "./dossier-followers-http.ts";

async function summaries(cap: string): Promise<DossierSummary[]> {
  const response = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/dossiers`);
  expect(response.status).toBe(200);
  return response.json();
}

test("all existing dossiers are listed once, with owner precedence and restricted foreign enrichment", async () => {
  const owner = await createInstructeurWithDossier(db, {
    email: "owner@global.fr",
    nomGroupe: "Global owner service",
  });
  const reader = await createInstructeurWithDossier(db, {
    email: "reader@global.fr",
    nomGroupe: "Global reader service",
    demarcheNumber: 12345,
  });
  const orphan = await createDossier(db, { source: "pitchou", demarche_number: null });
  const secondGroup = await createGroupeInstructeurs(db, { name: "Second reader service" });
  await attachCapToGroupe(db, reader.cap, secondGroup.id);
  await db("commentaire").insert([
    { dossier: owner.dossier.id, content: "Foreign internal comment" },
    { dossier: reader.dossier.id, content: "Own internal comment" },
  ]);
  const phaseDate = "2026-07-01T12:00:00.000Z";
  await db("evenement_phase_dossier").insert([
    {
      dossier: owner.dossier.id,
      phase: "Instruction",
      timestamp: phaseDate,
      caused_by_personne: owner.id,
    },
    { dossier: owner.dossier.id, phase: "Contrôle", timestamp: "2026-08-01T12:00:00.000Z" },
    {
      dossier: reader.dossier.id,
      phase: "Instruction",
      timestamp: phaseDate,
      caused_by_personne: reader.id,
    },
  ]);
  await db("decision_administrative").insert({
    dossier: owner.dossier.id,
    number: "AP-GLOBAL",
    type: "Arrêté dérogation",
  });
  await db("avis_expert").insert([
    { dossier: owner.dossier.id, expert: "CNPN" },
    { dossier: owner.dossier.id, expert: "CSRPN" },
    { dossier: owner.dossier.id, expert: "Ministre" },
    { dossier: owner.dossier.id, expert: "Autre expert" },
    { dossier: reader.dossier.id, expert: "Autre expert" },
  ]);

  const listed = await summaries(reader.cap);
  const ids = listed.map(({ id }) => id);
  expect(ids.sort()).toEqual((await db("dossier").pluck("id")).sort());
  expect(new Set(ids).size).toBe(ids.length);
  const foreign = listed.find(({ id }) => id === owner.dossier.id)!;
  expect(foreign).toMatchObject({
    access: "lecture",
    phase: "Instruction",
    phase_start_date: phaseDate,
  });
  expect(foreign).not.toHaveProperty("latestCommentaire");
  expect(foreign.decisionsAdministratives).toMatchObject([{ number: "AP-GLOBAL", hasFile: false }]);
  expect(foreign.avisExperts).toHaveLength(3);
  expect(foreign.avisExperts.map(({ expert }) => expert).sort()).toEqual([
    "CNPN",
    "CSRPN",
    "Ministre",
  ]);
  for (const avis of foreign.avisExperts) {
    expect(avis).not.toHaveProperty("hasSaisineFile");
    expect(avis.hasAvisFile).toBe(false);
  }
  expect(listed.find(({ id }) => id === reader.dossier.id)).toMatchObject({
    access: "complet",
    latestCommentaire: "Own internal comment",
    avisExperts: [{ expert: "Autre expert", hasSaisineFile: false, hasAvisFile: false }],
  });
  expect(listed.find(({ id }) => id === orphan.id)?.access).toBe("lecture");
  const response = await fetchAuthenticated(
    reader.cap,
    `${INTEGRATION_BASE_URL}/dossier/${orphan.id}`,
  );
  expect(response.status).toBe(200);
  expect((await response.json()).access).toBe("lecture");

  // Global summary phases must not broaden the service history endpoint.
  const history = await fetchAuthenticated(
    reader.cap,
    `${INTEGRATION_BASE_URL}/dossiers/evenements-phases`,
  );
  expect(history.status).toBe(200);
  const events: { dossier: number }[] = await history.json();
  expect(events.length).toBeGreaterThan(0);
  expect(events.every(({ dossier }) => dossier === reader.dossier.id)).toBe(true);
});

test("removing the final membership revokes all dossier access", async () => {
  const owner = await createInstructeurWithDossier(db);
  const id = owner.dossier.id as DossierId;
  await expect(dossiersAccessibleToUser(id, sessionUserId(owner.cap), db)).resolves.toEqual(
    new Map([[id, "complet"]]),
  );
  await db("user_groupe").where({ user_id: owner.id }).delete();
  await expect(dossiersAccessibleToUser(id, sessionUserId(owner.cap), db)).resolves.toEqual(
    new Map(),
  );
  expect((await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/dossiers`)).status).toBe(
    403,
  );
  expect((await fetch(`${INTEGRATION_BASE_URL}/dossiers`)).status).toBe(401);
});

test("global readers receive no CNPN email history, notification state or follow management", async () => {
  const owner = await createInstructeurWithDossier(db, {
    email: "owner@internal.fr",
    nomGroupe: "Internal owner service",
  });
  const reader = await createInstructeurWithCapToGroup(db, {
    email: "reader@internal.fr",
    nomGroupe: "Internal reader service",
  });
  await db("dossier_cnpn_email_sent_event").insert({
    id: randomUUID(),
    dossier: owner.dossier.id,
    status: "sent",
    sent_at: new Date(),
    sent_by_email: owner.email,
    recipient_email: "cnpn@example.test",
    subject: "Internal CNPN subject",
    html_body: "Internal body",
    payload_hash: "hash",
  });
  const read = async (cap: string): Promise<DossierFull> => {
    const response = await fetchAuthenticated(
      cap,
      `${INTEGRATION_BASE_URL}/dossier/${owner.dossier.id}`,
    );
    expect(response.status).toBe(200);
    return response.json();
  };
  expect((await read(owner.cap)).cnpnEmailSentEvents).toHaveLength(1);
  const foreign = await read(reader.cap);
  expect(foreign).not.toHaveProperty("cnpnEmailSentEvents");
  expect(foreign).not.toHaveProperty("notificationSnapshot");
  expect(JSON.stringify(foreign)).not.toContain("Internal CNPN subject");
  const notifications = await fetchAuthenticated(
    reader.cap,
    `${INTEGRATION_BASE_URL}/dossiers/notifications`,
  );
  expect(notifications.status).toBe(200);
  expect(await notifications.json()).toEqual([]);
  expect((await listCandidates(reader.cap, owner.dossier.id)).status).toBe(403);
  expect((await updateFollowers(reader.cap, owner.dossier.id, [reader.email])).status).toBe(403);
});
