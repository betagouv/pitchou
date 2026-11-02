import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

for (const width of [1280, 320]) {
  test(`user tabs retain drafts and keep selected groups separate at ${width}px`, async ({
    page,
    db,
    loginAs,
  }, testInfo) => {
    const admin = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
    await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
    const groups = await db("groupe_instructeurs")
      .insert(
        Array.from({ length: 45 }, (_, index) => ({
          name: `Service ${String(index + 1).padStart(2, "0")}`,
          active: index !== 44,
        })),
      )
      .returning("*");
    const [target] = await db("auth_user")
      .insert({ email: "camille@example.org", first_names: "Camille", last_name: "Martin" })
      .returning("*");
    await db("auth_permission_bundle").insert({ user_id: target.id, bundle: "instructeur" });
    const original = [groups[0], groups[22], groups[44]];
    await db("user_groupe").insert(
      original.map((group) => ({ user_id: target.id, groupe_instructeurs: group.id })),
    );
    await loginAs(admin.codeAcces);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width, height: 900 });
    await page.goto(E2E_ADMIN_BASE_URL + "/utilisateurs");
    const row = page.getByRole("button", { name: "Modifier camille@example.org", exact: true });
    await row.click();
    const dialog = page.getByRole("dialog");
    const account = dialog.getByRole("tab", { name: "Compte et profils", exact: true });
    const groupTab = dialog.getByRole("tab", { name: "Groupes", exact: true });
    const permissions = dialog.getByRole("tab", {
      name: "Permissions personnalisées",
      exact: true,
    });
    await expect(account).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("tabpanel")).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath(`user-account-${width}.png`) });
    await dialog.getByRole("switch", { name: "Compte actif" }).uncheck();
    await account.focus();
    await page.keyboard.press("ArrowRight");
    await expect(groupTab).toBeFocused();
    const selected = dialog.getByRole("region", { name: "Groupes sélectionnés", exact: true });
    const available = dialog.getByRole("region", { name: "Groupes disponibles", exact: true });
    for (const group of original) {
      await expect(
        selected.getByRole("button", { name: `Retirer ${group.name}`, exact: true }),
      ).toBeVisible();
      await expect(available.getByRole("checkbox", { name: group.name, exact: true })).toHaveCount(
        0,
      );
    }
    await expect(selected).toContainText("Archivé");
    const search = available.getByRole("searchbox");
    await search.fill("aucun résultat");
    await expect(available).toContainText("Aucun groupe ne correspond");
    await expect(selected.getByRole("button")).toHaveCount(3);
    await search.fill("Service 02");
    await available.getByRole("checkbox", { name: "Service 02", exact: true }).click();
    await expect(search).toBeFocused();
    await expect(selected.getByRole("button")).toHaveCount(4);
    await selected.getByRole("button", { name: "Retirer Service 23", exact: true }).click();
    await search.fill("");
    await expect(
      available.getByRole("checkbox", { name: "Service 23", exact: true }),
    ).toBeVisible();
    await account.click();
    await groupTab.click();
    await expect(selected).toBeInViewport();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`user-groups-${width}.png`) });
    await page.keyboard.press("End");
    await expect(permissions).toBeFocused();
    await dialog
      .getByRole("combobox", { name: "Exception : Instruire les dossiers autorisés", exact: true })
      .click();
    await page.getByRole("option", { name: "Refuser", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`user-permissions-${width}.png`) });
    await permissions.focus();
    await page.keyboard.press("ArrowRight");
    await expect(account).toBeFocused();
    await expect(dialog.getByRole("switch", { name: "Compte actif" })).not.toBeChecked();
    await groupTab.click();
    await expect(selected.getByRole("button")).toHaveCount(3);
    expect(
      await db("user_groupe").where({ user_id: target.id }).pluck("groupe_instructeurs"),
    ).toEqual(expect.arrayContaining(original.map((group) => group.id)));
    expect((await db("auth_user").where({ id: target.id }).first()).active).toBe(true);
    await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect((await db("auth_user").where({ id: target.id }).first()).active).toBe(false);
    expect(
      await db("auth_permission_exclusion").where({ user_id: target.id }).pluck("permission"),
    ).toEqual(["dossier:instruct"]);
    expect(
      (await db("user_groupe").where({ user_id: target.id }).pluck("groupe_instructeurs")).sort(),
    ).toEqual([groups[0].id, groups[1].id, groups[44].id].sort());
    await row.click();
    await groupTab.click();
    await selected.getByRole("button", { name: "Retirer Service 01", exact: true }).click();
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
    await row.click();
    await groupTab.click();
    await expect(
      selected.getByRole("button", { name: "Retirer Service 01", exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();

    await page.getByRole("button", { name: "Préparer un compte", exact: true }).click();
    await groupTab.click();
    await available.getByRole("checkbox", { name: "Service 02", exact: true }).click();
    await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(account).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByLabel("Adresse e-mail professionnelle")).toBeFocused();
    expect(
      await dialog
        .getByLabel("Adresse e-mail professionnelle")
        .evaluate((input: HTMLInputElement) => input.validity.valid),
    ).toBe(false);
    await groupTab.click();
    await expect(
      selected.getByRole("button", { name: "Retirer Service 02", exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  });
}

test("a rejected account change keeps the editor and its error visible", async ({
  page,
  db,
  loginAs,
}) => {
  const administrator = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  await loginAs(administrator.codeAcces);
  await page.goto(E2E_ADMIN_BASE_URL + "/utilisateurs");
  await page.getByRole("button", { name: "Modifier admin@example.org", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("switch", { name: "Compte actif" }).uncheck();
  await dialog.getByRole("tab", { name: "Groupes", exact: true }).click();
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog.locator("footer").getByRole("alert")).toContainText(
    "Vous ne pouvez pas retirer vos propres droits",
  );
  await expect(dialog.getByRole("button", { name: "Enregistrer", exact: true })).toBeEnabled();
  await expect(page.locator("header").getByRole("status")).toBeEmpty();
  expect((await db("auth_user").where({ id: administrator.id }).first()).active).toBe(true);
  await expect(dialog.getByRole("tab", { name: "Groupes", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await dialog.getByRole("tab", { name: "Compte et profils", exact: true }).click();
  await expect(dialog.getByRole("switch", { name: "Compte actif" })).not.toBeChecked();
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
