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

test("rule preview reports level changes, preserves manual levels, and rejects stale level state", async () => {
  const actor = await admin();
  const group = await createGroupeInstructeurs(db);
  const dossier = await createDossier(db, { primary_department: "75" });
  const manual = await createDossier(db, { primary_department: "75" });
  const input = {
    id: group.id,
    name: "Lecture",
    active: true,
    members: [],
    rules: [{ departments: ["75"], communes: [], activites: [], accessLevel: "read" }],
  };
  expect((await saveGroup(actor.token, input)).status).toBe(200);
  expect(await db("groupe_departement").where({ groupe_instructeurs: group.id })).toHaveLength(0);
  expect(await db("groupe_regle").where({ groupe_instructeurs: group.id })).toMatchObject([
    { access_level: "read" },
  ]);
  expect(
    (
      await post(actor.token, `/api/dossiers/${manual.id}/affectations`, {
        groupId: group.id,
        mode: "include",
        accessLevel: "read",
      })
    ).status,
  ).toBe(200);
  const instruction = { ...input, rules: [{ ...input.rules[0], accessLevel: "instruct" }] };
  const preview = await (
    await post(actor.token, "/api/groupes-instructeurs/apercu", instruction)
  ).json();
  expect(preview.added.count).toBe(0);
  expect(preview.removed.count).toBe(0);
  expect(preview.upgraded).toEqual({
    count: 1,
    dossiers: [{ id: dossier.id, name: dossier.name }],
  });
  expect(preview.downgraded.count).toBe(0);
  await db("groupe_dossier_override")
    .where({ dossier: manual.id })
    .update({ access_level: "instruct" });
  expect(
    (await saveGroup(actor.token, { ...instruction, previewToken: preview.token })).status,
  ).toBe(400);
  const fresh = await (
    await post(actor.token, "/api/groupes-instructeurs/apercu", instruction)
  ).json();
  expect((await saveGroup(actor.token, { ...instruction, previewToken: fresh.token })).status).toBe(
    200,
  );
  const downgrade = await (
    await post(actor.token, "/api/groupes-instructeurs/apercu", input)
  ).json();
  expect(downgrade.downgraded).toEqual({
    count: 1,
    dossiers: [{ id: dossier.id, name: dossier.name }],
  });
  expect(downgrade.upgraded.count).toBe(0);
});

test("direct user access can be added, changed and revoked with before and after audit", async () => {
  const actor = await admin();
  const dossier = await createDossier(db);
  const [user] = await db("auth_user")
    .insert({ email: "direct@example.org", permissions_configured: true })
    .returning("*");
  await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
  const route = `/api/dossiers/${dossier.id}/acces-utilisateurs`;
  const save = (accessLevel: unknown) => post(actor.token, route, { userId: user.id, accessLevel });
  const read = await save("read");
  expect(read.status).toBe(200);
  expect((await read.json()).grants).toMatchObject([
    { user_id: user.id, access_level: "read", effective_access: "lecture_complete" },
  ]);
  expect(await db("user_groupe").where({ user_id: user.id })).toHaveLength(0);
  expect((await save("instruct")).status).toBe(200);
  const audit = await db("administration_event")
    .where({ action: "dossier_user_access_saved" })
    .orderBy("id", "desc")
    .first();
  expect(audit.data.before.access_level).toBe("read");
  expect(audit.data.after.access_level).toBe("instruct");
  expect((await save("invalid")).status).toBe(400);
  expect((await save(null)).status).toBe(200);
  expect(await db("dossier_user_access").where({ dossier: dossier.id })).toHaveLength(0);
  const revoked = await db("administration_event")
    .where({ action: "dossier_user_access_saved" })
    .orderBy("id", "desc")
    .first();
  expect(revoked.data.before.access_level).toBe("instruct");
  expect(revoked.data.after).toBeNull();
  await db("auth_permission_exclusion").insert({ user_id: actor.id, permission: "groups:manage" });
  expect((await save("read")).status).toBe(403);
  expect(await db("dossier_user_access")).toHaveLength(0);
});
