import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup, createGroupeInstructeurs } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

for (const width of [1280, 320]) {
  test(`user and group editors have refreshable pages at ${width}px`, async ({
    page,
    db,
    loginAs,
  }, testInfo) => {
    const actor = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
    await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
    const [user] = await db("auth_user")
      .insert({ email: "camille@example.org", first_names: "Camille", last_name: "Martin" })
      .returning("*");
    const group = await createGroupeInstructeurs(db, { name: "DREAL Bretagne" });
    await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "29" });
    const second = await createGroupeInstructeurs(db, { name: "DDTM du Finistère" });
    const archived = await createGroupeInstructeurs(db, {
      name: "Ancien service régional",
    });
    await db("groupe_instructeurs").where({ id: archived.id }).update({ active: false });
    await db("user_groupe").insert(
      [group, second, archived].map((g) => ({ user_id: user.id, groupe_instructeurs: g.id })),
    );
    await loginAs(actor.codeAcces);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    const listUrl = `${E2E_ADMIN_BASE_URL}/utilisateurs?q=camille`;
    await page.goto(listUrl);
    await page.getByRole("button", { name: "Modifier camille@example.org", exact: true }).click();
    await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/utilisateurs/${user.id}?q=camille`);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Camille Martin");
    await page.getByRole("tab", { name: "Groupes", exact: true }).click();
    const selected = page.getByRole("region", { name: "Groupes sélectionnés", exact: true });
    await expect(selected.getByRole("listitem")).toHaveCount(3);
    await expect(selected).toContainText("Groupe archivé");
    await page.screenshot({ path: testInfo.outputPath(`user-groups-page-${width}.png`) });
    await selected.getByRole("button", { name: "Retirer DREAL Bretagne", exact: true }).click();
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(page).toHaveURL(listUrl);
    expect(await db("user_groupe").where({ user_id: user.id })).toHaveLength(3);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Camille Martin");
    await page.getByRole("tab", { name: "Compte et profils", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`user-account-page-${width}.png`) });
    await page.getByRole("tab", { name: "Permissions personnalisées", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`user-permissions-page-${width}.png`) });

    await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs/${group.id}`);
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("DREAL Bretagne");
    await expect(page.getByLabel("Nom du groupe")).toHaveValue("DREAL Bretagne");
    await page.screenshot({ path: testInfo.outputPath(`group-page-${width}.png`) });
    await page.getByLabel("Nom du groupe").fill("Brouillon Bretagne");
    await page.getByRole("button", { name: "Vérifier les affectations", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Vérifier les affectations", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Nom du groupe")).toHaveValue("Brouillon Bretagne");
    await page.getByRole("button", { name: "Vérifier les affectations", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
    expect((await db("groupe_instructeurs").where({ id: group.id }).first()).name).toBe(
      "Brouillon Bretagne",
    );
    await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs/nouveau`);
    await expect(page.getByLabel("Nom du groupe")).toHaveValue("");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
    for (const path of ["utilisateurs/invalid", "groupes-instructeurs/invalid"]) {
      expect((await page.goto(`${E2E_ADMIN_BASE_URL}/${path}`))?.status()).toBe(404);
    }
  });
}

test("editor pages require the same permissions as their directories", async ({
  page,
  db,
  loginAs,
}) => {
  const actor = await createInstructeurWithCapToGroup(db);
  await db("auth_permission").insert({ user_id: actor.id, permission: "admin:access" });
  await loginAs(actor.codeAcces);
  for (const path of [
    "utilisateurs/nouveau",
    `utilisateurs/${actor.id}`,
    "groupes-instructeurs/nouveau",
    "groupes-instructeurs/invalid",
  ]) {
    expect((await page.goto(`${E2E_ADMIN_BASE_URL}/${path}`))?.status()).toBe(403);
  }
});
