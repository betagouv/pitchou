import { fetchAuthenticated } from "../helpers/auth.ts";
import { expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../setup/db.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { putPendingUpload, readS3Body, s3HasKey } from "../helpers/fileStorage.ts";

test("POST /decision-administrative crée la décision et stocke le PDF sur S3", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const pdfBytes = "DECISION-PDF-V1";
  const upload = await putPendingUpload(pdfBytes, "arrete.pdf");

  const res = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/decision-administrative`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dossier: dossier.id,
      number: "AP-001",
      type: "Arrêté dérogation",
      signature_date: new Date("2026-04-15").toISOString(),
      obligations_end_date: new Date("2031-04-15").toISOString(),
      fichier_upload: upload,
    }),
  });
  expect(res.status).toBe(200);

  const decisions = await db("decision_administrative").select("*").where({ dossier: dossier.id });
  expect(decisions).toHaveLength(1);
  const decision = decisions[0];
  expect(decision.number).toBe("AP-001");
  expect(decision.fichier).not.toBeNull();

  expect(decision.fichier).toBe(upload.id);
  expect(await readS3Body(`files/${decision.fichier}`)).toBe(pdfBytes);
});

test("POST /decision-administrative en modification remplace le PDF S3 (best-effort cleanup ancien objet)", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const v1 = await putPendingUpload("DECISION-V1", "v1.pdf");
  const v2 = await putPendingUpload("DECISION-V2-DIFFERENT", "v2.pdf");

  // initial creation
  const res1 = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/decision-administrative`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dossier: dossier.id,
      number: "AP-002",
      type: "Arrêté dérogation",
      signature_date: new Date("2026-04-15").toISOString(),
      obligations_end_date: new Date("2031-04-15").toISOString(),
      fichier_upload: v1,
    }),
  });
  expect(res1.status).toBe(200);
  const decision1 = await db("decision_administrative")
    .select("*")
    .where({ dossier: dossier.id })
    .first();
  const v1Key = `files/${decision1.fichier}`;

  // modification
  const res2 = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/decision-administrative`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: decision1.id,
      dossier: dossier.id,
      number: "AP-002",
      type: "Arrêté dérogation",
      signature_date: new Date("2026-04-15").toISOString(),
      obligations_end_date: new Date("2031-04-15").toISOString(),
      fichier_upload: v2,
    }),
  });
  expect(res2.status).toBe(200);

  const decision2 = await db("decision_administrative")
    .select("*")
    .where({ id: decision1.id })
    .first();
  expect(decision2.fichier).not.toBe(decision1.fichier);
  const v2Key = `files/${decision2.fichier}`;

  expect(await readS3Body(v2Key)).toBe("DECISION-V2-DIFFERENT");
  // old object should have been swept
  expect(await s3HasKey(v1Key)).toBe(false);
});

test("POST /decision-administrative rejette un type de propriété incorrect", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/decision-administrative`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dossier: dossier.id,
      number: 42,
      type: "Arrêté dérogation",
    }),
  });

  expect(res.status).toBe(400);
  expect(await db("decision_administrative").where({ dossier: dossier.id })).toHaveLength(0);
});

test("decision updates reject foreign IDs and reassignment, even between owned dossiers", async () => {
  const owner = await createInstructeurWithDossier(db, {
    email: "owner@decision.fr",
    nomGroupe: "Decision owner service",
  });
  const foreign = await createInstructeurWithDossier(db, {
    email: "foreign@decision.fr",
    nomGroupe: "Foreign decision service",
  });
  const secondOwned = await createDossier(db);
  await attachDossierToGroupe(db, secondOwned.id, owner.groupeId);
  const [foreignDecision, ownedDecision] = await db("decision_administrative")
    .insert([
      { dossier: foreign.dossier.id, number: "FOREIGN" },
      { dossier: secondOwned.id, number: "OWNED" },
    ])
    .returning("*");
  const filesBefore = await db("file").pluck("id");
  const replacement = await putPendingUpload("REPLACEMENT", "replacement.pdf");
  for (const id of [foreignDecision.id, ownedDecision.id, randomUUID()]) {
    const response = await fetchAuthenticated(
      owner.cap,
      `${INTEGRATION_BASE_URL}/decision-administrative`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          dossier: owner.dossier.id,
          number: "REASSIGNED",
          type: "Arrêté dérogation",
          signature_date: "2026-04-15",
          obligations_end_date: "2031-04-15",
          fichier_upload: replacement,
        }),
      },
    );
    expect(response.status).toBe(403);
  }
  expect(await db("decision_administrative").where({ id: foreignDecision.id }).first()).toEqual(
    foreignDecision,
  );
  expect(await db("decision_administrative").where({ id: ownedDecision.id }).first()).toEqual(
    ownedDecision,
  );
  expect((await db("file").pluck("id")).sort()).toEqual(filesBefore.sort());
  expect(await db("action_dossier").where({ dossier: owner.dossier.id })).toHaveLength(0);
});
