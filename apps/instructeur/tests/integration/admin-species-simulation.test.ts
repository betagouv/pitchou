import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  simulateSpeciesChange,
  speciesSimulationGroups,
} from "../../../admin/src/lib/server/simulateSpecies.ts";
import * as actionDossier from "@pitchou/server/database/action_dossier.ts";
import { speciesImpactChangeField } from "@pitchou/common/especes/impactGroup.ts";
import {
  getNotificationsForPersonneFromCap,
  updateNotificationDossierFromCap,
} from "@pitchou/server/database/notification.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import { db } from "../setup/db.ts";
import {
  attachCapToGroupe,
  createDossier,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
} from "../factories/index.ts";

beforeEach(() => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("NODE_ENV", "production");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function setup() {
  const owner = await createInstructeurWithDossier(db);
  const id = owner.dossier.id as DossierId;
  const cap = owner.cap as CapDossierCap;
  const other = await createDossier(db, { demarche_numerique_number: "102" });
  const file = {
    id: randomUUID(),
    name: "original.ods",
    media_type: "application/vnd.oasis.opendocument.spreadsheet",
    size: "5",
  };
  await db("file").insert(file);
  await db("dossier")
    .where({ id })
    .update({ demarche_numerique_number: "101", especes_impactees: file.id });
  const reference = await db("impact_type").where({ identifiant_pitchou: "P-4-2" }).first();
  const otherType = await db("impact_type")
    .whereNotIn("identifiant_pitchou", ["P-4-2", "P-2-1"])
    .first();
  await db("impact_espece").insert(
    [
      { dossier: id, impact_type: "P-4-2", surface_habitat_detruit: 100 },
      { dossier: id, impact_type: "P-4-2", surface_habitat_detruit: 200 },
      { dossier: id, impact_type: "P-2-1", nombre_individus: "1-10" },
      { dossier: id, impact_type: null, nombre_individus: "1-10" },
      { dossier: other.id, impact_type: "P-4-2", surface_habitat_detruit: 300 },
      { dossier: other.id, impact_type: otherType.identifiant_pitchou },
    ].map((row) => ({ ...row, cd_ref: "2437", classification: "oiseau", source_file: file.id })),
  );
  const rows = await db("impact_espece").orderBy("id");
  const notification = async (personCap = cap) =>
    (await getNotificationsForPersonneFromCap(personCap, db, id))[0];
  return { owner, id, cap, other, otherType, file, reference, rows, notification };
}

test("lists distinct groups belonging only to this dossier, including the null group", async () => {
  const { id, reference } = await setup();
  const capture = await db("impact_type").where({ identifiant_pitchou: "P-2-1" }).first();
  expect(await speciesSimulationGroups(id, db)).toEqual([
    { id: "P-2-1", label: capture.libelle_pitchou },
    { id: "P-4-2", label: reference.libelle_pitchou },
    { id: null, label: "Type d'impact non renseign\u00e9" },
  ]);
  const empty = await createDossier(db);
  expect(await speciesSimulationGroups(empty.id as DossierId, db)).toEqual([]);
});

test("changes only the first selected row and reopens personal review with a new revision", async () => {
  const { owner, id, cap, other, file, reference, rows, notification } = await setup();
  const colleague = await createInstructeurWithCapToGroup(db, {
    nomGroupe: "Simulation colleague",
  });
  await attachCapToGroupe(db, colleague.cap, owner.groupeId);
  await db("edge_personne_follows_dossier").insert({ dossier: id, personne: owner.id });
  const arrival = (await notification()).new_arrival;
  expect(arrival).not.toBeNull();
  const field = speciesImpactChangeField("P-4-2");
  const first = rows.find((row) => row.dossier === id && row.impact_type === "P-4-2")!;
  for (const quantity of [101, 102]) {
    expect(await simulateSpeciesChange(id, "P-4-2", db)).toMatchObject({ changed: true });
    expect(await db("impact_espece").where({ id: first.id }).first()).toEqual({
      ...first,
      surface_habitat_detruit: quantity,
      updated_at: expect.any(Date),
    });
    expect(await db("impact_espece").whereNot({ id: first.id }).orderBy("id")).toEqual(
      rows.filter((row) => row.id !== first.id),
    );
    const actions = await db("action_dossier").where({ dossier: id }).orderBy("created_at");
    expect(actions).toHaveLength(quantity - 100);
    const action = actions.at(-1)!;
    expect(action).toMatchObject({
      type: "especes_renseignees",
      author_petitionnaire: true,
      data: {
        field: "especes",
        notification_field: field,
        label: reference.libelle_pitchou,
        notification: true,
        simulated: true,
        from: quantity - 1,
        to: quantity,
      },
    });
    expect((await notification()).changes).toMatchObject([
      { field, label: reference.libelle_pitchou, revisions: [action.id] },
    ]);
    expect(
      await db("notification").where({ dossier: id, personne: owner.id }).first(),
    ).toMatchObject({ viewed: false });
    if (quantity === 102) expect(action.id).not.toBe(actions[0].id);
    await updateNotificationDossierFromCap(cap, { dossier: id, revisions: [action.id] }, db);
    expect((await notification()).changes).toEqual([]);
    expect((await notification(colleague.cap as CapDossierCap)).changes[0].revisions).toHaveLength(
      quantity - 100,
    );
    expect((await notification()).new_arrival).toEqual(arrival);
  }
  expect(await db("action_dossier").where({ dossier: other.id })).toEqual([]);
  expect(await db("notification").where({ dossier: other.id })).toEqual([]);
  expect(await db("dossier").where({ id }).first()).toMatchObject({ especes_impactees: file.id });
  expect(await db("file").where({ id: file.id }).first()).toMatchObject(file);
});

test("allows local execution and changes the null group's fallback quantity", async () => {
  const { id, rows, notification } = await setup();
  vi.stubEnv("PUBLIC_PITCHOU_ENV", undefined);
  vi.stubEnv("NODE_ENV", "development");
  expect(await speciesSimulationGroups(id, db)).toHaveLength(3);
  const first = rows.find((row) => row.impact_type === null)!;
  for (const quantity of ["11-100", "1-10"]) {
    await simulateSpeciesChange(id, null, db);
    expect(await db("impact_espece").where({ id: first.id }).first()).toMatchObject({
      nombre_individus: quantity,
      source_file: first.source_file,
    });
  }
  expect((await notification()).changes).toMatchObject([
    { field: speciesImpactChangeField(null), label: "Type d'impact non renseign\u00e9" },
  ]);
  expect((await notification()).changes[0].revisions).toHaveLength(2);
  expect(await db("impact_espece").whereNot({ id: first.id }).orderBy("id")).toEqual(
    rows.filter((row) => row.id !== first.id),
  );
});

test("production denies direct helper calls before opening a transaction", async () => {
  const { id, rows } = await setup();
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "production");
  vi.stubEnv("NODE_ENV", "production");
  const transaction = vi.spyOn(db, "transaction");
  expect(await speciesSimulationGroups(id, db)).toEqual([]);
  await expect(simulateSpeciesChange(id, "P-4-2", db)).rejects.toMatchObject({ status: 404 });
  expect(transaction).not.toHaveBeenCalled();
  expect(await db("impact_espece").orderBy("id")).toEqual(rows);
  expect(await db("action_dossier")).toEqual([]);
});

test("rejects nonexistent and other-dossier groups without writes", async () => {
  const { id, otherType, rows } = await setup();
  for (const group of ["unknown", otherType.identifiant_pitchou]) {
    await expect(simulateSpeciesChange(id, group, db)).rejects.toMatchObject({ status: 400 });
  }
  expect(await db("impact_espece").orderBy("id")).toEqual(rows);
  expect(await db("action_dossier")).toEqual([]);
  expect(await db("notification")).toEqual([]);
});

test("rolls back the quantity when writing the action fails", async () => {
  const { id, rows, notification } = await setup();
  const before = await notification();
  const log = vi
    .spyOn(actionDossier, "logActionsDossier")
    .mockImplementationOnce(async (_, trx) => {
      const changed = await trx!("impact_espece")
        .where({ dossier: id, impact_type: "P-4-2" })
        .orderBy("id")
        .first();
      expect(changed.surface_habitat_detruit).toBe(101);
      throw new Error("Action insert failed");
    });
  await expect(simulateSpeciesChange(id, "P-4-2", db)).rejects.toThrow("Action insert failed");
  expect(log).toHaveBeenCalledOnce();
  expect(await db("impact_espece").orderBy("id")).toEqual(rows);
  expect(await db("action_dossier")).toEqual([]);
  expect(await notification()).toEqual(before);
});
