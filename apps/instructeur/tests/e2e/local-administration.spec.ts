import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("an administrator prepares a user and assigns department coverage through the forms", async ({
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
  await page.goto(`${E2E_ADMIN_BASE_URL}/utilisateurs`);
  await expect(page.getByRole("heading", { level: 1, name: "Utilisateurs" })).toBeVisible();
  await page.locator("header").getByRole("button", { name: "Préparer un compte" }).click();
  await page.getByLabel("Adresse e-mail professionnelle").fill("future@example.org");
  await page.getByLabel("Instructeur", { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("header").getByRole("status")).toHaveText("Utilisateur enregistré");
  await expect(page.locator("main .fr-alert--success")).toHaveCount(0);
  const [user] = await db("auth_user").where({ email: "future@example.org" });
  expect(await db("auth_permission_bundle").where({ user_id: user.id }).pluck("bundle")).toEqual([
    "instructeur",
  ]);

  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await expect(page.getByRole("columnheader", { name: "État", exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Gestion", exact: true })).toHaveCount(0);
  await page.locator("header").getByRole("button", { name: "Créer un groupe" }).click();
  const editor = page.locator(".editor-page");
  await expect(editor).toBeVisible();
  await expect(
    editor
      .locator("footer")
      .getByRole("button", { name: "Vérifier les affectations", exact: true }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 640 });
  await expect(
    editor.locator("footer").getByRole("button", { name: "Annuler", exact: true }),
  ).toBeInViewport();
  await expect(
    editor
      .locator("footer")
      .getByRole("button", { name: "Vérifier les affectations", exact: true }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel("Nom du groupe").fill("Service Paris");
  await page.getByRole("button", { name: "Ajouter une règle" }).click();
  await page.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
  await page.getByRole("option", { name: "Département principal", exact: true }).click();
  await page.getByRole("button", { name: "Sélectionner des départements", exact: true }).click();
  await page.getByText("75 - Paris", { exact: true }).click();
  await page.getByRole("button", { name: "75 - Paris", exact: true }).click();
  await page.getByRole("tab", { name: /Membres/u }).click();
  await page.getByLabel("future@example.org", { exact: true }).click();
  await page.getByRole("button", { name: "Vérifier les affectations" }).click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const saveStatus = page.locator("header").getByRole("status");
  await expect(saveStatus).toHaveText("Groupe enregistré");
  await expect(page.locator("main .fr-alert--success")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 640 });
  await expect(saveStatus).toBeInViewport();
  await expect(
    page.locator("header").getByRole("button", { name: "Créer un groupe" }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(saveStatus).toBeEmpty({ timeout: 5000 });
  await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  const [group] = await db("groupe_instructeurs").where({ name: "Service Paris" });
  expect(
    await db("groupe_departement").where({ groupe_instructeurs: group.id }).pluck("department"),
  ).toEqual(["75"]);
  expect(await db("user_groupe").where({ groupe_instructeurs: group.id }).pluck("user_id")).toEqual(
    [user.id],
  );

  const activeSection = page.getByRole("region", { name: "Actifs", exact: true });
  await activeSection.getByRole("button", { name: "Modifier Service Paris", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Service Paris", exact: true })).toBeVisible();
  await page.getByLabel("Nom du groupe").fill("Unsaved name");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await activeSection.getByRole("button", { name: "Modifier Service Paris", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Nom du groupe")).toHaveValue("Service Paris");
  await page.getByRole("button", { name: "75 - Paris", exact: true }).click();
  await expect(page.getByLabel("75 - Paris", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "75 - Paris", exact: true }).click();
  await page.getByRole("tab", { name: /Membres/u }).click();
  await expect(
    page
      .getByRole("region", { name: "Membres sélectionnés" })
      .getByRole("button", { name: "Retirer future@example.org", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Groupe actif", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Vérifier les affectations" }).click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await expect(page.getByRole("region", { name: "Archivés", exact: true })).toContainText(
    "Service Paris",
  );
  await expect(page.locator("main section[aria-label] > header > h2")).toHaveText([
    /À vérifier/u,
    /Actifs/u,
    /Archivés/u,
  ]);

  await page.goto(`${E2E_ADMIN_BASE_URL}/utilisateurs`);
  await page.getByRole("button", { name: "Modifier future@example.org", exact: true }).click();
  await editor.getByRole("tab", { name: "Permissions personnalisées", exact: true }).click();
  await page
    .getByRole("combobox", {
      name: "Exception : Instruire les dossiers autorisés",
      exact: true,
    })
    .click();
  await page.getByRole("option", { name: "Refuser", exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("header").getByRole("status")).toContainText("Utilisateur enregistré");
  expect(
    await db("auth_permission_exclusion").where({ user_id: user.id }).pluck("permission"),
  ).toEqual(["dossier:instruct"]);
});
