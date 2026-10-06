import { expect, test } from "vitest";
import { up } from "../../../../libs/database/migrations/20261005104000_granular-admin-permissions.ts";
import { db } from "../setup/db.ts";
import { connectUser, getSessionUser } from "@pitchou/server/users.ts";
import { createSession } from "@pitchou/server/session.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { ADMIN_BASE_URL } from "../setup/integration-global.ts";
import { createDossier } from "../factories/index.ts";

test("migration expands grants and exclusions without restoring denied access", async () => {
  const [granted, excluded] = await db("auth_user")
    .insert([{ email: "granted@test.fr" }, { email: "excluded@test.fr" }])
    .returning("*");
  await db("auth_permission").insert([
    { user_id: granted.id, permission: "admin:write" },
    { user_id: granted.id, permission: "admin:dossiers:update" },
    { user_id: excluded.id, permission: "admin:write" },
  ]);
  await db("auth_permission_bundle").insert({ user_id: excluded.id, bundle: "administrateur" });
  await db("auth_permission_exclusion").insert([
    { user_id: excluded.id, permission: "admin:write" },
    { user_id: granted.id, permission: "admin:dossiers:delete" },
  ]);
  await db.transaction(up);
  await db.transaction(up);
  expect(await db("auth_permission").where({ user_id: granted.id })).toHaveLength(12);
  expect((await getSessionUser(granted.id, db))!.permissions).toContain("admin:sync:run");
  expect((await getSessionUser(granted.id, db))!.permissions).not.toContain(
    "admin:dossiers:delete",
  );
  expect(
    (await getSessionUser(excluded.id, db))!.permissions.filter(
      (p) => p.startsWith("admin:") && p !== "admin:access",
    ),
  ).toEqual([]);
  expect(await db("auth_permission_exclusion").where({ permission: "admin:write" })).toHaveLength(
    0,
  );
});

test("HTTP writes require the specific permission, including combined dossier uploads", async () => {
  const user = await connectUser(
    {
      issuer: "https://proconnect.test",
      subject: "limited-admin",
      email: "limited@test.fr",
      firstNames: "Limited",
      lastName: "Admin",
    },
    db,
  );
  await db("auth_permission").insert([
    { user_id: user.id, permission: "admin:access" },
    { user_id: user.id, permission: "admin:dossiers:update" },
  ]);
  const token = await createSession(
    { userId: user.id, email: user.email!, name: "Limited", idToken: null },
    db,
  );
  async function write(path: string, method: string, body: object = {}) {
    return fetchAuthenticated(token, ADMIN_BASE_URL + path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  for (const [path, method] of [
    ["/api/dossiers", "POST"],
    ["/api/dossiers/123", "DELETE"],
    ["/api/changelog", "POST"],
    ["/api/synchronisation-dn", "POST"],
    ["/api/dossiers/123/pieces-jointes", "POST"],
  ]) {
    expect((await write(path, method)).status).toBe(403);
  }
  for (const uploads of [
    { attachments: [{ id: "00000000-0000-0000-0000-000000000001", name: "file.pdf" }] },
    { speciesFile: { id: "00000000-0000-0000-0000-000000000001", name: "species.ods" } },
  ]) {
    expect((await write("/api/dossiers/123", "PUT", { uploads })).status).toBe(403);
  }
  const dossier = await createDossier(db, { source: "pitchou" });
  const update = { columns: { name: "Updated by a limited administrator" } };
  expect((await write(`/api/dossiers/${dossier.id}`, "PUT", update)).status).toBe(200);
  expect((await db("dossier").where({ id: dossier.id }).first()).name).toBe(update.columns.name);
  await db("auth_permission_exclusion").insert({
    user_id: user.id,
    permission: "admin:dossiers:update",
  });
  expect((await write(`/api/dossiers/${dossier.id}`, "PUT", update)).status).toBe(403);
});

test("changelog creation requires publication rights only for published entries", async () => {
  const [user] = await db("auth_user").insert({ email: "changelog@test.fr" }).returning("*");
  await db("auth_permission").insert([
    { user_id: user.id, permission: "admin:access" },
    { user_id: user.id, permission: "admin:changelog:create" },
  ]);
  const token = await createSession(
    { userId: user.id, email: user.email, name: "Editor", idToken: null },
    db,
  );
  const payload = {
    version_major: 1,
    version_minor: 0,
    version_patch: 0,
    date: "2026-10-05",
    titre: "Nouvelle version",
    contenu: "<p>Une nouveauté</p>",
    published: true,
  };
  const create = (published: boolean) =>
    fetchAuthenticated(token, `${ADMIN_BASE_URL}/api/changelog`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, published }),
    });
  expect((await create(true)).status).toBe(403);
  expect(await db("changelog")).toHaveLength(0);
  const draft = await create(false);
  expect(draft.status).toBe(201);
  expect((await db("changelog").first()).published).toBe(false);
  await db("changelog").delete();
  await db("auth_permission").insert({ user_id: user.id, permission: "admin:changelog:update" });
  expect((await create(true)).status).toBe(201);
  expect((await db("changelog").first()).published).toBe(true);
  await db("changelog").delete();
  await db("auth_permission_exclusion").insert({
    user_id: user.id,
    permission: "admin:changelog:update",
  });
  expect((await create(true)).status).toBe(403);
  expect(await db("changelog")).toHaveLength(0);
});
