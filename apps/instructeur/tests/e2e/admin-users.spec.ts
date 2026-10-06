import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("users can be found, paginated and edited without losing their permissions", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const administrator = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  const users = await db("auth_user")
    .insert(
      Array.from({ length: 30 }, (_, i) => ({
        email: `user${String(i).padStart(2, "0")}@example.org`,
        first_names: i === 23 ? "Élodie" : null,
        last_name: i === 23 ? "Moreau" : null,
        active: i < 25,
      })),
    )
    .returning("*");
  const target = users[23];
  await db("auth_permission_bundle").insert({ user_id: target.id, bundle: "instructeur" });
  await db("auth_permission").insert({ user_id: target.id, permission: "admin:dossiers:update" });
  const membership = await db("user_groupe").where({ user_id: administrator.id }).first();
  await db("user_groupe").insert({
    user_id: target.id,
    groupe_instructeurs: membership.groupe_instructeurs,
  });
  await loginAs(administrator.codeAcces);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(E2E_ADMIN_BASE_URL + "/utilisateurs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Utilisateurs");
  await expect(page.getByRole("columnheader", { name: "Gestion", exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "État", exact: true })).toHaveCount(0);
  const active = page.getByRole("region", { name: "Actifs", exact: true });
  const search = page.getByRole("searchbox", { name: "Rechercher un utilisateur" });
  const profile = page.getByRole("combobox", { name: "Filtrer par profil" });
  const searchHeight = await search
    .locator("..")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(await profile.evaluate((element) => element.getBoundingClientRect().height)).toBe(
    searchHeight,
  );
  const topPagination = active.getByRole("navigation", {
    name: "Pages des utilisateurs actifs",
    exact: true,
  });
  await expect(active.getByRole("button", { name: /^Modifier / })).toHaveCount(20);
  await topPagination.getByRole("button", { name: "Page suivante" }).click();
  await expect(active.getByText("Page 2 sur 2")).toBeVisible();
  await expect(page).toHaveURL(/actifs=2/);
  await page.reload();
  await expect(active.getByText("Page 2 sur 2")).toBeVisible();
  const pagination = active.getByRole("navigation", {
    name: "Pagination des utilisateurs actifs",
    exact: true,
  });
  await pagination.getByRole("button", { name: "Page 1", exact: true }).click();
  await expect(topPagination.getByRole("button", { name: "Page précédente" })).toBeDisabled();
  await pagination.getByRole("button", { name: "Dernière page" }).click();
  await expect(topPagination.getByRole("button", { name: "Page suivante" })).toBeDisabled();
  await page.getByRole("button", { name: "Trier", exact: true }).click();
  await page.getByRole("button", { name: "Adresse e-mail Ordre croissant" }).click();
  await expect(active.getByRole("button", { name: /^Modifier / }).first()).toHaveAttribute(
    "aria-label",
    "Modifier user24@example.org",
  );
  await expect(active.getByText("Page 1 sur 2")).toBeVisible();
  await expect(page).toHaveURL(/ordre=desc/);
  await page.screenshot({ path: testInfo.outputPath("users-sort-dark.png") });
  await page.getByRole("button", { name: "Adresse e-mail Ordre décroissant" }).click();
  await expect(active.getByRole("button", { name: /^Modifier / }).first()).toHaveAttribute(
    "aria-label",
    "Modifier admin@example.org",
  );
  await page.getByRole("button", { name: "Trier", exact: true }).click();
  await topPagination.getByRole("button", { name: "Page suivante" }).click();
  await page.getByRole("searchbox", { name: "Rechercher un utilisateur" }).fill("elodie");
  await expect(active.getByRole("button", { name: /^Modifier / })).toHaveCount(1);
  await expect(active).toContainText("Élodie Moreau");
  await expect(active.getByRole("navigation")).toHaveCount(0);
  await expect(page).not.toHaveURL(/actifs=/);
  await page.getByRole("searchbox").fill("aucun-resultat");
  await expect(active).toContainText("Aucun utilisateur ne correspond");
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(active.getByText("Page 1 sur 2")).toBeVisible();
  await page.getByRole("combobox", { name: "Filtrer par profil" }).click();
  await page.getByRole("option", { name: "Instructeur", exact: true }).click();
  await expect(active.getByRole("button", { name: /^Modifier / })).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("users-dark.png") });
  const targetRow = page.getByRole("button", { name: `Modifier ${target.email}`, exact: true });
  await targetRow.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Modifier l'utilisateur" });
  await expect(dialog.getByLabel("Adresse e-mail professionnelle")).toHaveAttribute("readonly", "");
  await expect(dialog.getByLabel("Instructeur", { exact: true })).toBeChecked();
  await expect(dialog.getByLabel("Exception : Modifier les dossiers")).toHaveText("Autoriser");
  for (const width of [1280, 760, 390]) {
    await page.setViewportSize({ width, height: 720 });
    const overflowingControls = await dialog.getByRole("combobox").evaluateAll((controls) =>
      controls
        .filter((control) => {
          const bounds = control.getBoundingClientRect();
          const row = control.closest(".permission-row")!.getBoundingClientRect();
          return bounds.left < row.left - 1 || bounds.right > row.right + 1;
        })
        .map((control) => control.getAttribute("aria-label")),
    );
    expect(overflowingControls, `Permission dropdowns must fit their rows at ${width}px`).toEqual(
      [],
    );
    await dialog.getByRole("combobox").last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`permissions-${width}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await dialog
    .getByRole("combobox", { name: "Exception : Instruire les dossiers de ses groupes" })
    .click();
  await page.getByRole("option", { name: "Refuser", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("user-editor-dark.png") });
  await page.setViewportSize({ width: 390, height: 640 });
  await expect(dialog.locator("footer").getByRole("button", { name: "Annuler" })).toBeInViewport();
  await expect(
    dialog.locator("footer").getByRole("button", { name: "Enregistrer", exact: true }),
  ).toBeInViewport();
  await dialog.getByRole("switch", { name: "Compte actif" }).uncheck();
  // Collapsing advanced rights must still submit every selected exception.
  await dialog.locator("summary").click();
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("header").getByRole("status")).toHaveText("Utilisateur enregistré");
  await expect(page.getByRole("region", { name: "Désactivés", exact: true })).toContainText(
    "Élodie Moreau",
  );
  expect((await db("auth_user").where({ id: target.id }).first()).active).toBe(false);
  expect(await db("auth_permission").where({ user_id: target.id }).pluck("permission")).toEqual([
    "admin:dossiers:update",
  ]);
  expect(
    await db("auth_permission_exclusion").where({ user_id: target.id }).pluck("permission"),
  ).toEqual(["dossier:instruct"]);
  expect(await db("auth_permission_bundle").where({ user_id: target.id }).pluck("bundle")).toEqual([
    "instructeur",
  ]);
});

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
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog.locator("footer").getByRole("alert")).toContainText(
    "Vous ne pouvez pas retirer vos propres droits",
  );
  await expect(dialog.getByRole("button", { name: "Enregistrer", exact: true })).toBeEnabled();
  await expect(page.locator("header").getByRole("status")).toBeEmpty();
  expect((await db("auth_user").where({ id: administrator.id }).first()).active).toBe(true);
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("limited administrators are not offered unrelated write actions", async ({
  page,
  db,
  loginAs,
}) => {
  const user = await createInstructeurWithCapToGroup(db, { email: "limited@example.org" });
  await db("auth_permission").insert([
    { user_id: user.id, permission: "admin:access" },
    { user_id: user.id, permission: "admin:dossiers:update" },
  ]);
  await loginAs(user.codeAcces);
  await page.goto(E2E_ADMIN_BASE_URL + "/dossiers");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dossiers");
  await expect(page.getByRole("button", { name: "Créer un dossier", exact: true })).toHaveCount(0);
  await page.goto(E2E_ADMIN_BASE_URL + "/changelog");
  await expect(page.getByRole("button", { name: "Nouvelle entrée", exact: true })).toHaveCount(0);
  await page.goto(E2E_ADMIN_BASE_URL + "/tech");
  await expect(
    page.getByRole("button", { name: "Lancer la synchronisation", exact: true }),
  ).toBeDisabled();
});
