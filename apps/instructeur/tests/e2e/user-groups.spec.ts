import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("user editor saves, removes and prepares group memberships", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const admin = await createInstructeurWithCapToGroup(db, {
    email: "admin@example.org",
    nomGroupe: "Bretagne",
  });
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  const [archived] = await db("groupe_instructeurs")
    .insert({ name: "Ancien service", active: false })
    .returning("*");
  const [target] = await db("auth_user").insert({ email: "cible@example.org" }).returning("*");
  await loginAs(admin.codeAcces);
  await page.goto(E2E_ADMIN_BASE_URL + "/utilisateurs");
  const row = page.getByRole("button", { name: "Modifier cible@example.org", exact: true });
  const editor = page.locator(".editor-page");
  await row.click();
  await editor.getByRole("tab", { name: "Groupes", exact: true }).click();
  await editor.getByRole("checkbox", { name: "Bretagne", exact: true }).click();
  await editor.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(await db("user_groupe").where({ user_id: target.id })).toHaveLength(0);
  await row.click();
  await editor.getByRole("tab", { name: "Groupes", exact: true }).click();
  await editor.getByRole("checkbox", { name: "Bretagne", exact: true }).click();
  await editor.getByRole("searchbox", { name: "Rechercher un groupe" }).fill("ancien");
  await editor.getByRole("checkbox", { name: "Ancien service", exact: true }).click();
  await editor.getByRole("searchbox", { name: "Rechercher un groupe" }).fill("");
  await expect(editor.getByText("2 groupes sélectionnés.", { exact: true })).toBeVisible();
  await page.emulateMedia({ colorScheme: "dark" });
  await editor.getByRole("group", { name: "Choisir les groupes" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("user-groups-dark.png") });
  await editor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(
    (await db("user_groupe").where({ user_id: target.id }).pluck("groupe_instructeurs")).sort(),
  ).toEqual([admin.groupeId, archived.id].sort());
  const audit = await db("administration_event")
    .where({ action: "user_saved" })
    .orderBy("id", "desc")
    .first();
  expect(audit.data.after.groupIds.sort()).toEqual([admin.groupeId, archived.id].sort());
  await row.click();
  await editor.getByRole("tab", { name: "Groupes", exact: true }).click();
  await expect(
    editor.getByRole("button", { name: "Retirer Ancien service", exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Retirer Bretagne", exact: true }).click();
  await expect(editor.getByText(/Aucun groupe actif sélectionné/u)).toBeVisible();
  await editor.getByRole("button", { name: "Retirer Ancien service", exact: true }).click();
  await editor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(await db("user_groupe").where({ user_id: target.id })).toHaveLength(0);

  await page.getByRole("button", { name: "Préparer un compte", exact: true }).click();
  await editor.getByLabel("Adresse e-mail professionnelle").fill("nouveau@example.org");
  await editor.getByRole("checkbox", { name: "Instructeur", exact: true }).check();
  await editor.getByRole("tab", { name: "Groupes", exact: true }).click();
  await editor.getByRole("checkbox", { name: "Bretagne", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 800 });
  await editor.getByRole("group", { name: "Choisir les groupes" }).scrollIntoViewIfNeeded();
  await expect(editor.getByRole("button", { name: "Enregistrer", exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("user-groups-mobile.png") });
  await editor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const prepared = await db("auth_user").where({ email: "nouveau@example.org" }).first();
  expect(
    await db("user_groupe").where({ user_id: prepared.id }).pluck("groupe_instructeurs"),
  ).toEqual([admin.groupeId]);
});

test("group changes require permission and invalid changes roll back user edits", async ({
  page,
  db,
  loginAs,
}) => {
  const admin = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  await db("auth_permission_exclusion").insert({ user_id: admin.id, permission: "groups:manage" });
  const [target] = await db("auth_user").insert({ email: "cible@example.org" }).returning("*");
  await db("user_groupe").insert({ user_id: target.id, groupe_instructeurs: admin.groupeId });
  await loginAs(admin.codeAcces);
  await page.goto(E2E_ADMIN_BASE_URL + "/utilisateurs");
  await page.getByRole("button", { name: "Modifier cible@example.org", exact: true }).click();
  await page.locator(".editor-page").getByRole("tab", { name: "Groupes", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Rechercher un groupe" })).toHaveCount(0);
  await expect(
    page.getByText("La modification des groupes nécessite", { exact: false }),
  ).toBeVisible();
  const input = {
    id: target.id,
    email: target.email,
    active: false,
    bundles: ["instructeur"],
    grants: [],
    exclusions: [],
  };
  const save = (body: object) =>
    page.evaluate(async (body) => {
      const result = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return result.status;
    }, body);
  expect(await save({ ...input, groupIds: [] })).toBe(400);
  expect((await db("auth_user").where({ id: target.id }).first()).active).toBe(true);
  expect(await save(input)).toBe(200);
  expect(await db("user_groupe").where({ user_id: target.id })).toHaveLength(1);
  await db("auth_permission_exclusion").where({ user_id: admin.id }).delete();
  expect(
    await save({ ...input, active: true, groupIds: ["00000000-0000-0000-0000-000000000001"] }),
  ).toBe(400);
  expect((await db("auth_user").where({ id: target.id }).first()).active).toBe(false);
  expect(await db("user_groupe").where({ user_id: target.id })).toHaveLength(1);
  expect(await save({ ...input, groupIds: ["invalid"] })).toBe(400);
});
