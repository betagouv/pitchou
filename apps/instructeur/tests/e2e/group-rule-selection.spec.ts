import { test, expect } from "../fixtures/playwright.ts";
import { departements } from "@pitchou/common/departements.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("empty criteria are unfinished while selecting all departments creates valid coverage", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const actor = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
  await createDossier(db, { primary_department: "75", name: "Projet parisien" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ colorScheme: "dark" });
  await loginAs(actor.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await page.getByRole("button", { name: "Créer un groupe", exact: true }).click();
  const editor = page.getByRole("region", { name: "Modifier le groupe", exact: true });
  const verify = editor.getByRole("button", { name: "Vérifier les affectations", exact: true });
  const add = editor.getByRole("combobox", { name: "Ajouter un critère à la règle 1" });
  await editor.getByLabel("Nom du groupe").fill("Tous les départements");
  await expect(verify).toBeEnabled();
  await page.getByRole("tab", { name: /Règles/u }).click();
  await editor.getByRole("button", { name: "Ajouter une règle", exact: true }).click();
  await expect(verify).toBeDisabled();
  await add.click();
  await editor.getByRole("option", { name: "Département principal", exact: true }).click();
  const empty = editor.getByRole("button", { name: "Sélectionner des départements", exact: true });
  await expect(empty).toBeVisible();
  await expect(verify).toBeDisabled();
  await expect(editor).toContainText(
    "Sélectionnez au moins un département, ou retirez ce critère.",
  );
  await page.screenshot({ path: testInfo.outputPath("01-empty-selection.png") });
  await empty.click();
  const choices = editor.getByRole("group", { name: "Départements", exact: true });
  await expect(choices.locator("input:checked")).toHaveCount(0);
  await choices.getByRole("button", { name: "Tout", exact: true }).click();
  await expect(choices.locator("input:checked")).toHaveCount(departements.length);
  await page.keyboard.press("Escape");
  await expect(
    editor.getByRole("button", { name: "Tous les départements", exact: true }),
  ).toBeVisible();
  await expect(verify).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("02-all-selected.png") });
  await add.click();
  await editor.getByRole("option", { name: "Activité principale", exact: true }).click();
  await expect(verify).toBeDisabled();
  await editor.getByRole("button", { name: "Sélectionner des activités", exact: true }).click();
  const activities = editor.getByRole("group", { name: "Activités", exact: true });
  await activities.getByRole("button", { name: "Tout", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(verify).toBeEnabled();
  await editor.getByRole("button", { name: "Toutes les activités", exact: true }).click();
  await activities.getByRole("button", { name: "Aucun", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(verify).toBeDisabled();
  await editor.getByRole("tab", { name: /Membres/u }).click();
  await expect(verify).toBeDisabled();
  await editor.getByRole("tab", { name: /Règles/u }).click();
  await editor
    .getByRole("button", { name: "Retirer le critère Activité principale", exact: true })
    .click();
  await expect(verify).toBeEnabled();
  await add.click();
  await editor.getByRole("option", { name: "Communes du projet", exact: true }).click();
  await expect(verify).toBeDisabled();
  await editor
    .getByRole("button", { name: "Retirer le critère Communes du projet", exact: true })
    .click();
  await verify.click();
  await expect(editor.getByRole("region", { name: "Aperçu des affectations" })).toContainText(
    "Dossiers ajoutés",
  );
  await editor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const group = await db("groupe_instructeurs").where({ name: "Tous les départements" }).first();
  expect(await db("groupe_departement").where({ groupe_instructeurs: group.id })).toHaveLength(
    departements.length,
  );
});
