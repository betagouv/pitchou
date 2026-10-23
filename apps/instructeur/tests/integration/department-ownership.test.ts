import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import {
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { ADMIN_BASE_URL, INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";

import { admin, saveGroup } from "../helpers/administration.ts";
test("department ownership includes every matching group and recalculates across sources", async () => {
  const administrator = await admin();
  const first = await saveGroup(administrator.token, {
    name: "Local",
    active: true,
    departments: ["75"],
    members: [],
  });
  expect(first.status).toBe(200);
  const group = await first.json();
  const national = await saveGroup(administrator.token, {
    name: "National",
    active: true,
    departments: ["75", "69"],
    members: [],
  });
  const all = await national.json();
  for (const source of ["pitchou", "demarche_numerique"] as const) {
    const dossier = await createDossier(db, { source, primary_department: "75" });
    expect(
      await db("edge_groupe_instructeurs__dossier").where({ dossier: dossier.id }),
    ).toHaveLength(2);
    await db("dossier").where({ id: dossier.id }).update({ primary_department: "69" });
    expect(
      await db("edge_groupe_instructeurs__dossier")
        .where({ dossier: dossier.id })
        .pluck("groupe_instructeurs"),
    ).toEqual([all.id]);
    await db("dossier").where({ id: dossier.id }).update({ primary_department: "75" });
  }
  const change = await saveGroup(administrator.token, {
    id: group.id,
    name: "Local",
    active: true,
    departments: ["69"],
    members: [],
  });
  expect(change.status).toBe(200);
  expect(
    await db("edge_groupe_instructeurs__dossier").where({ groupe_instructeurs: group.id }),
  ).toHaveLength(0);
  const listing = await fetchAuthenticated(administrator.token, `${ADMIN_BASE_URL}/api/dossiers`);
  expect(listing.status).toBe(200);
  const result = await listing.json();
  expect(result.total).toBe(2);
  expect(result.dossiers).toHaveLength(2);
});

test("removing one of several owning memberships preserves a follower, removing the last revokes access", async () => {
  const instructor = await createInstructeurWithDossier(db);
  const second = await createGroupeInstructeurs(db, { name: "Second" });
  const dossier = await db("dossier").where({ id: instructor.dossier.id }).first();
  await db("groupe_departement").insert({
    groupe_instructeurs: second.id,
    department: dossier.primary_department,
  });
  await db("user_groupe").insert({ user_id: instructor.id, groupe_instructeurs: second.id });
  await db("edge_personne_follows_dossier").insert({
    personne: instructor.id,
    dossier: dossier.id,
  });
  await db("user_groupe")
    .where({ user_id: instructor.id, groupe_instructeurs: instructor.groupeId })
    .delete();
  expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
  expect(
    (await fetchAuthenticated(instructor.cap, `${INTEGRATION_BASE_URL}/dossier/${dossier.id}`))
      .status,
  ).toBe(200);
  await db("user_groupe").where({ user_id: instructor.id }).delete();
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
  expect(
    (await fetchAuthenticated(instructor.cap, `${INTEGRATION_BASE_URL}/dossiers`)).status,
  ).toBe(403);
});

test("DN import cannot create users, memberships or follower assignments", async () => {
  const { dumpDossiers } = await import("@pitchou/server/database/dossier.ts");
  const group = await createGroupeInstructeurs(db);
  await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "75" });
  await dumpDossiers(
    [
      {
        dossier: {
          name: "Imported dossier",
          source: "demarche_numerique",
          demarche_number: 88444,
          demarche_numerique_number: "987654",
          primary_department: "75",
          depot_date: new Date(),
        },
        evenement_phase_dossier: [],
        avis_expert: [],
        decision_administrative: [],
        followers: [{ email: "external-dn-account@example.org" }],
      },
    ],
    [],
    db,
  );
  expect(await db("auth_user")).toHaveLength(0);
  expect(await db("personne")).toHaveLength(0);
  expect(await db("user_groupe")).toHaveLength(0);
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
  expect(await db("edge_groupe_instructeurs__dossier").pluck("groupe_instructeurs")).toEqual([
    group.id,
  ]);
});
