import { test, expect } from "../fixtures/playwright.ts";
import {
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("criteria are added on demand and draft rules survive preview, tabs and sibling removal", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const actor = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
  const group = await createGroupeInstructeurs(db, { name: "DREAL Nouvelle-Aquitaine" });
  await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "40" });
  await createDossier(db, { name: "Parc solaire des Landes", primary_department: "40" });
  await createDossier(db, {
    name: "Restauration de la ripisylve à Pau",
    primary_department: "64",
    communes: JSON.stringify([{ name: "Pau", code: "64445" }]),
  });
  await page.route("https://geo.api.gouv.fr/communes?*", (route) =>
    route.fulfill({ json: [{ nom: "Pau", code: "64445", codesPostaux: ["64000"] }] }),
  );
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ colorScheme: "dark" });
  await loginAs(actor.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await page
    .getByRole("button", { name: "Modifier DREAL Nouvelle-Aquitaine", exact: true })
    .click();
  const editor = page.getByRole("region", { name: "Modifier le groupe", exact: true });
  const addCriterion = (number: number) =>
    editor.getByRole("combobox", { name: `Ajouter un critère à la règle ${number}` });
  await expect(editor.getByLabel("Rechercher une commune")).toHaveCount(0);
  await expect(editor.getByRole("button", { name: "Sélectionner des activités" })).toHaveCount(0);
  await editor.getByRole("button", { name: "Ajouter une règle", exact: true }).click();
  const rules = editor.getByRole("group", { name: /^Règle/u });
  await expect(rules).toHaveCount(2);
  await expect(
    rules.nth(1).getByRole("button", { name: "Sélectionner des départements" }),
  ).toHaveCount(0);
  await addCriterion(2).click();
  await expect(editor.getByRole("option")).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath("01-add-criterion.png") });
  await editor.getByRole("option", { name: "Département principal", exact: true }).click();
  await rules
    .nth(1)
    .getByRole("button", { name: "Sélectionner des départements", exact: true })
    .click();
  await editor.getByText("64 - Pyrénées-Atlantiques", { exact: true }).click();
  await editor.getByRole("button", { name: "64 - Pyrénées-Atlantiques", exact: true }).click();
  await addCriterion(2).click();
  await expect(
    editor.getByRole("option", { name: "Département principal", exact: true }),
  ).toHaveCount(0);
  await editor.getByRole("option", { name: "Communes du projet", exact: true }).click();
  await editor.getByLabel("Rechercher une commune").fill("Pau");
  await editor.getByRole("button", { name: "Pau (64000)", exact: true }).click();
  await editor.getByLabel("Rechercher une commune").fill("Pau");
  await rules.nth(0).getByRole("button", { name: "Supprimer cette règle", exact: true }).click();
  await expect(rules).toHaveCount(1);
  await expect(editor.getByLabel("Rechercher une commune")).toHaveValue("Pau");
  await editor.getByRole("tab", { name: /Membres/u }).click();
  await editor.getByRole("tab", { name: /Règles/u }).click();
  await expect(editor.getByLabel("Rechercher une commune")).toHaveValue("Pau");
  const access = editor.getByRole("combobox", { name: "Niveau d'accès de la règle 1" });
  await access.click();
  await page.screenshot({ path: testInfo.outputPath("02-access-options.png") });
  await page.keyboard.press("Escape");
  await expect(editor).toBeVisible();
  await expect(access).toBeFocused();
  const verify = editor.getByRole("button", { name: "Vérifier les affectations" });
  await verify.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Vérifier les affectations");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.locator(".editor-content")).toHaveAttribute("inert", "");
  const preview = editor.getByRole("region", { name: "Aperçu des affectations" });
  await expect(preview.locator("dl > div").filter({ hasText: "Dossiers ajoutés" })).toContainText(
    "1",
  );
  await expect(preview.locator("dl > div").filter({ hasText: "Dossiers retirés" })).toContainText(
    "1",
  );
  for (const summary of await preview.locator("summary").all()) await summary.click();
  await expect(preview.getByRole("link", { name: /Restauration/u })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("03-preview.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(editor.getByRole("button", { name: "Enregistrer", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath("04-preview-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(verify).toBeFocused();
  await expect(editor.getByLabel("Rechercher une commune")).toHaveValue("Pau");
  await editor
    .getByRole("button", { name: "Retirer le critère Communes du projet", exact: true })
    .click();
  await expect(editor.getByLabel("Rechercher une commune")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect(addCriterion(1)).toHaveText("+ Ajouter un critère");
  await page.screenshot({ path: testInfo.outputPath("05-rule.png") });
  await editor.getByRole("button", { name: "Vérifier les affectations" }).click();
  await editor.getByRole("button", { name: "Revenir à l'édition", exact: true }).click();
  await expect(verify).toBeFocused();
  await editor
    .getByRole("button", { name: "Retirer le critère Département principal", exact: true })
    .click();
  await expect(editor.getByRole("button", { name: "Vérifier les affectations" })).toBeDisabled();
  await expect(editor.getByRole("button", { name: "Enregistrer", exact: true })).toHaveCount(0);
  await addCriterion(1).click();
  await editor.getByRole("option", { name: "Département principal", exact: true }).click();
  await editor.getByRole("button", { name: "Sélectionner des départements", exact: true }).click();
  await editor.getByText("64 - Pyrénées-Atlantiques", { exact: true }).click();
  await editor.getByRole("button", { name: "64 - Pyrénées-Atlantiques", exact: true }).click();
  await editor.getByRole("button", { name: "Vérifier les affectations" }).click();
  await editor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(
    await db("groupe_departement").where({ groupe_instructeurs: group.id }).pluck("department"),
  ).toEqual(["64"]);
});
