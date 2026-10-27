import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createDossier, createGroupeInstructeurs } from "../factories/index.ts";
import { admin, saveGroup } from "../helpers/administration.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { ADMIN_BASE_URL } from "../setup/integration-global.ts";

const post = (token: string, route: string, body: object) =>
  fetchAuthenticated(token, ADMIN_BASE_URL + route, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("preview respects manual exceptions and rejects a stale preview without writes", async () => {
  const actor = await admin();
  const group = await createGroupeInstructeurs(db);
  const included = await createDossier(db, { primary_department: "69" });
  const excluded = await createDossier(db, { primary_department: "75" });
  const added = await createDossier(db, { primary_department: "75" });
  await db("groupe_dossier_override").insert([
    { groupe_instructeurs: group.id, dossier: included.id, mode: "include" },
    { groupe_instructeurs: group.id, dossier: excluded.id, mode: "exclude" },
  ]);
  const input = {
    id: group.id,
    name: "Preview",
    active: true,
    members: [],
    rules: [{ departments: ["75"], communes: [], activites: [] }],
  };
  const response = await post(actor.token, "/api/groupes-instructeurs/apercu", input);
  expect(response.status).toBe(200);
  const preview = await response.json();
  expect(preview.added).toEqual({ count: 1, dossiers: [{ id: added.id, name: added.name }] });
  expect(preview.removed.count).toBe(0);
  expect(await db("groupe_departement")).toHaveLength(0);
  const newcomer = await createDossier(db, { primary_department: "75" });
  expect((await saveGroup(actor.token, { ...input, previewToken: preview.token })).status).toBe(
    400,
  );
  expect(await db("groupe_departement")).toHaveLength(0);
  const fresh = await (await post(actor.token, "/api/groupes-instructeurs/apercu", input)).json();
  expect(fresh.added.count).toBe(2);
  expect((await saveGroup(actor.token, { ...input, previewToken: fresh.token })).status).toBe(200);
  expect(
    await db("edge_groupe_instructeurs__dossier")
      .where({ groupe_instructeurs: group.id })
      .orderBy("dossier")
      .pluck("dossier"),
  ).toEqual([included.id, added.id, newcomer.id]);
  const remove = await (
    await post(actor.token, "/api/groupes-instructeurs/apercu", { ...input, rules: [] })
  ).json();
  expect(remove.removed.count).toBe(2);
});

test("group routing writes and previews require group management even for dossier editors", async () => {
  const actor = await admin();
  const group = await createGroupeInstructeurs(db);
  const dossier = await createDossier(db);
  await db("auth_permission_exclusion").insert({ user_id: actor.id, permission: "groups:manage" });
  const input = { id: group.id, name: "Denied", active: true, members: [], rules: [] };
  expect((await post(actor.token, "/api/groupes-instructeurs/apercu", input)).status).toBe(403);
  expect((await saveGroup(actor.token, input)).status).toBe(403);
  expect(
    (
      await post(actor.token, `/api/dossiers/${dossier.id}/affectations`, {
        groupId: group.id,
        mode: "include",
      })
    ).status,
  ).toBe(403);
  expect(await db("groupe_dossier_override")).toHaveLength(0);
});

test.each([
  [{ departments: [], communes: [], activites: [] }],
  [{ departments: ["XX"], communes: [], activites: [] }],
  [{ departments: [], communes: ["2100"], activites: [] }],
  [{ departments: [], communes: [], activites: ["missing-activity"] }],
])("invalid routing criteria cannot be previewed or saved: %j", async (rules) => {
  const actor = await admin();
  const input = { name: "Invalid", active: true, members: [], rules };
  expect((await post(actor.token, "/api/groupes-instructeurs/apercu", input)).status).toBe(400);
  expect((await saveGroup(actor.token, input)).status).toBe(400);
  expect(await db("groupe_instructeurs")).toHaveLength(0);
});
