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
  const dialog = page.getByRole("dialog");
  await row.click();
  await dialog.getByRole("checkbox", { name: "Bretagne", exact: true }).check();
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(await db("user_groupe").where({ user_id: target.id })).toHaveLength(0);
  await row.click();
  await dialog.getByRole("checkbox", { name: "Bretagne", exact: true }).check();
  await dialog.getByRole("searchbox", { name: "Rechercher un groupe" }).fill("ancien");
  await dialog.getByRole("checkbox", { name: "Ancien service", exact: true }).check();
  await dialog.getByRole("searchbox", { name: "Rechercher un groupe" }).fill("");
  await expect(dialog.getByText("2 groupes sélectionnés.", { exact: true })).toBeVisible();
  await page.emulateMedia({ colorScheme: "dark" });
  await dialog.getByRole("group", { name: "Choisir les groupes" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("user-groups-dark.png") });
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    (await db("user_groupe").where({ user_id: target.id }).pluck("groupe_instructeurs")).sort(),
  ).toEqual([admin.groupeId, archived.id].sort());
  const audit = await db("administration_event")
    .where({ action: "user_saved" })
    .orderBy("id", "desc")
    .first();
  expect(audit.data.after.groupIds.sort()).toEqual([admin.groupeId, archived.id].sort());
  await row.click();
  await expect(dialog.getByRole("checkbox", { name: "Ancien service", exact: true })).toBeChecked();
  await dialog.getByRole("checkbox", { name: "Bretagne", exact: true }).uncheck();
  await expect(dialog.getByText(/Aucun groupe actif sélectionné/)).toBeVisible();
  await dialog.getByRole("checkbox", { name: "Ancien service", exact: true }).uncheck();
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await db("user_groupe").where({ user_id: target.id })).toHaveLength(0);

  await page.getByRole("button", { name: "Préparer un compte", exact: true }).click();
  await dialog.getByLabel("Adresse e-mail professionnelle").fill("nouveau@example.org");
  await dialog.getByRole("checkbox", { name: "Instructeur", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "Bretagne", exact: true }).check();
  await page.setViewportSize({ width: 390, height: 800 });
  await dialog.getByRole("group", { name: "Choisir les groupes" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Enregistrer", exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("user-groups-mobile.png") });
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
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
