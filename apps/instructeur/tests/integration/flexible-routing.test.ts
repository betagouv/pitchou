import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import {
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { admin, saveGroup } from "../helpers/administration.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { ADMIN_BASE_URL } from "../setup/integration-global.ts";

const photovoltaic = "Production énergie renouvelable - Photovoltaïque";
const ownership = (dossier: number) =>
  db("edge_groupe_instructeurs__dossier")
    .where({ dossier })
    .orderBy("groupe_instructeurs")
    .pluck("groupe_instructeurs");
const changeAssignment = (token: string, dossier: number, groupId: string, mode: string) =>
  fetchAuthenticated(token, `${ADMIN_BASE_URL}/api/dossiers/${dossier}/affectations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ groupId, mode }),
  });

test("rules combine criteria with AND, rules with OR, and assign every matching group across sources", async () => {
  const actor = await admin();
  const response = await saveGroup(actor.token, {
    name: "Conditional",
    active: true,
    members: [],
    rules: [
      { departments: ["40"], communes: ["40088"], activites: ["energie-photovoltaique"] },
      { departments: ["21"], communes: [], activites: ["carrieres"] },
    ],
  });
  expect(response.status).toBe(200);
  const group = await response.json();
  const broad = await (
    await saveGroup(actor.token, {
      name: "Department",
      active: true,
      members: [],
      departments: ["40"],
    })
  ).json();
  for (const source of ["pitchou", "demarche_numerique"] as const) {
    const dossier = await createDossier(db, {
      source,
      primary_department: "40",
      main_activite: photovoltaic,
      communes: JSON.stringify([{ code: "40088" }, { code: "40192" }]),
    });
    expect(await ownership(dossier.id)).toEqual([group.id, broad.id].sort());
    await db("dossier")
      .where({ id: dossier.id })
      .update({ communes: JSON.stringify([{ code: "40192" }]) });
    expect(await ownership(dossier.id)).toEqual([broad.id]);
    await db("dossier")
      .where({ id: dossier.id })
      .update({ primary_department: "21", main_activite: "Carrières" });
    expect(await ownership(dossier.id)).toEqual([group.id]);
    await db("dossier").where({ id: dossier.id }).update({ main_activite: null });
    expect(await ownership(dossier.id)).toEqual([]);
  }
  const missing = await createDossier(db, { main_activite: photovoltaic });
  expect(await ownership(missing.id)).toEqual([]);
});

test("manual-only groups preserve inclusions, exclusions survive recomputation, and origins explain the result", async () => {
  const actor = await admin();
  const group = await createGroupeInstructeurs(db, { name: "DGALN" });
  const dossier = await createDossier(db, { primary_department: "75" });
  expect((await changeAssignment(actor.token, dossier.id, group.id, "include")).status).toBe(200);
  await db("dossier").where({ id: dossier.id }).update({ primary_department: "21" });
  await db.raw("SELECT refresh_pitchou_ownership(NULL)");
  expect(await ownership(dossier.id)).toEqual([group.id]);
  await saveGroup(actor.token, {
    id: group.id,
    name: group.name,
    active: true,
    members: [],
    departments: ["21"],
  });
  expect((await changeAssignment(actor.token, dossier.id, group.id, "exclude")).status).toBe(200);
  await db.raw("SELECT refresh_pitchou_ownership(NULL)");
  expect(await ownership(dossier.id)).toEqual([]);
  const origins = await (
    await fetchAuthenticated(
      actor.token,
      `${ADMIN_BASE_URL}/api/dossiers/${dossier.id}/affectations`,
    )
  ).json();
  expect(origins).toContainEqual(
    expect.objectContaining({
      id: group.id,
      automatic: true,
      assigned: false,
      mode: "exclude",
      departments: ["21"],
    }),
  );
  expect((await changeAssignment(actor.token, dossier.id, group.id, "auto")).status).toBe(200);
  expect(await ownership(dossier.id)).toEqual([group.id]);
  expect(
    await db("administration_event").where({ action: "dossier_assignment_saved" }),
  ).toHaveLength(3);
  await saveGroup(actor.token, {
    id: group.id,
    name: group.name,
    active: false,
    members: [],
    departments: ["21"],
  });
  expect(await ownership(dossier.id)).toEqual([]);
  await changeAssignment(actor.token, dossier.id, group.id, "include");
  expect(await ownership(dossier.id)).toEqual([]);
  await saveGroup(actor.token, {
    id: group.id,
    name: group.name,
    active: true,
    members: [],
    rules: [],
  });
  expect(await ownership(dossier.id)).toEqual([group.id]);
});

test("replacing equivalent rules preserves follows and excluding the last owning group removes them", async () => {
  const actor = await admin();
  const instructor = await createInstructeurWithDossier(db);
  await changeAssignment(actor.token, instructor.dossier.id, instructor.groupeId, "auto");
  await db("dossier")
    .where({ id: instructor.dossier.id })
    .update({ primary_department: "40", main_activite: photovoltaic });
  const input = {
    id: instructor.groupeId,
    name: "Local",
    active: true,
    members: [instructor.id],
    rules: [{ departments: ["40"], communes: [], activites: ["energie-photovoltaique"] }],
  };
  expect((await saveGroup(actor.token, input)).status).toBe(200);
  await db("edge_personne_follows_dossier").insert({
    dossier: instructor.dossier.id,
    personne: instructor.id,
  });
  expect(
    (
      await saveGroup(actor.token, {
        ...input,
        rules: [{ departments: ["40"], communes: [], activites: [] }],
      })
    ).status,
  ).toBe(200);
  expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
  await changeAssignment(actor.token, instructor.dossier.id, instructor.groupeId, "exclude");
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
});

test("activity mappings recalculate routing, pending labels resolve to autre and missing activity stays unmatched", async () => {
  const actor = await admin();
  const label = "Routing test unclassified activity";
  try {
    await db("activite_label").insert({ label, activite_code: "autre", needs_review: true });
    const other = await (
      await saveGroup(actor.token, {
        name: "Other",
        active: true,
        members: [],
        rules: [{ departments: [], communes: [], activites: ["autre"] }],
      })
    ).json();
    const solar = await (
      await saveGroup(actor.token, {
        name: "Solar",
        active: true,
        members: [],
        rules: [{ departments: [], communes: [], activites: ["energie-photovoltaique"] }],
      })
    ).json();
    const dossier = await createDossier(db, { main_activite: label });
    expect(await ownership(dossier.id)).toEqual([other.id]);
    await db("activite_label")
      .where({ label })
      .update({ activite_code: "energie-photovoltaique", needs_review: false });
    expect(await ownership(dossier.id)).toEqual([solar.id]);
    await db("dossier").where({ id: dossier.id }).update({ main_activite: null });
    expect(await ownership(dossier.id)).toEqual([]);
  } finally {
    await db("activite_label").where({ label }).delete();
  }
});
