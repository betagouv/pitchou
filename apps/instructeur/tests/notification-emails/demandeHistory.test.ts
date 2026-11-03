import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { createDossier } from "../factories/dossier.ts";

test("a transaction creates one complete state, including nested records and full text", async () => {
  const dossier = await createDossier(db);
  const baseline = await db("demande_revision").where({ dossier: dossier.id });
  expect(baseline).toHaveLength(1);
  await db.transaction(async (trx) => {
    await trx("dossier")
      .where({ id: dossier.id })
      .update({ description: "Full text ".repeat(100) });
    const [decision] = await trx("decision_administrative")
      .insert({ dossier: dossier.id, type: "Arrêté dérogation" })
      .returning("id");
    const [prescription] = await trx("prescription")
      .insert({ decision_administrative: decision.id, description: "Protect habitat" })
      .returning("id");
    await trx("controle").insert({ prescription: prescription.id, result: "Conforme" });
    expect(await trx("demande_revision").where({ dossier: dossier.id })).toHaveLength(1);
  });
  const revisions = await db("demande_revision").where({ dossier: dossier.id }).orderBy("id");
  expect(revisions).toHaveLength(2);
  expect(revisions[1].state.dossier.description).toBe("Full text ".repeat(100));
  expect(revisions[1].state.controles).toMatchObject([{ result: "Conforme" }]);
  expect(await db("demande_revision_pending")).toEqual([]);
});

test("rollback and no-op changes do not create historical states", async () => {
  const dossier = await createDossier(db);
  await expect(
    db.transaction(async (trx) => {
      await trx("dossier").where({ id: dossier.id }).update({ name: "Rolled back" });
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  await db("dossier").where({ id: dossier.id }).update({ name: dossier.name });
  expect(await db("demande_revision").where({ dossier: dossier.id })).toHaveLength(1);
});

test("deleted child records remain readable in earlier immutable states", async () => {
  const dossier = await createDossier(db);
  const [decision] = await db("decision_administrative")
    .insert({ dossier: dossier.id, number: "2026-1" })
    .returning("id");
  await db("decision_administrative").where({ id: decision.id }).delete();
  const revisions = await db("demande_revision").where({ dossier: dossier.id }).orderBy("id");
  expect(revisions).toHaveLength(3);
  expect(revisions[1].state.decisions).toMatchObject([{ number: "2026-1" }]);
  expect(revisions[2].state.decisions).toEqual([]);
  await expect(
    db("demande_revision").where({ id: revisions[1].id }).update({ state: {} }),
  ).rejects.toThrow("immutable");
});

test("retains referenced documents after removal from the current demande", async () => {
  const dossier = await createDossier(db);
  const [file] = await db("file")
    .insert({ name: "Avis.pdf", size: "10", media_type: "application/pdf" })
    .returning("id");
  const [avis] = await db("avis_expert")
    .insert({ dossier: dossier.id, expert: "CNPN", avis_fichier: file.id })
    .returning("id");
  await db("avis_expert").where({ id: avis.id }).delete();
  expect(await db("demande_revision_file").where({ fichier: file.id })).toHaveLength(1);
  await expect(db("file").where({ id: file.id }).delete()).rejects.toThrow();
});

test("concurrent changes in separate tables retain both committed states", async () => {
  const dossier = await createDossier(db);
  const first = await db.transaction();
  const second = await db.transaction();
  try {
    await first("decision_administrative").insert({ dossier: dossier.id, number: "Concurrent" });
    const secondWrite = second("evenement_phase_dossier")
      .insert({ dossier: dossier.id, phase: "Instruction", timestamp: new Date() })
      .then(() => second.commit());
    await first.commit();
    await secondWrite;
    const revisions = await db("demande_revision").where({ dossier: dossier.id }).orderBy("id");
    expect(revisions).toHaveLength(3);
    expect(revisions[1].state.decisions).toMatchObject([{ number: "Concurrent" }]);
    expect(revisions[1].state.phases).toEqual([]);
    expect(revisions[2].state.decisions).toMatchObject([{ number: "Concurrent" }]);
    expect(revisions[2].state.phases).toMatchObject([{ phase: "Instruction" }]);
  } finally {
    if (!first.isCompleted()) await first.rollback();
    if (!second.isCompleted()) await second.rollback();
  }
});
