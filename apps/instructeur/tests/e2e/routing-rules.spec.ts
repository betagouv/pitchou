import { test, expect } from "../fixtures/playwright.ts";
import {
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";
import { chooseInSelect } from "../helpers/select.ts";

test("an admin previews a combined rule and manages persistent dossier exceptions", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const actor = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
  const dossier = await createDossier(db, {
    name: "Projet solaire de démonstration",
    primary_department: "40",
    main_activite: "Production énergie renouvelable - Photovoltaïque",
    communes: JSON.stringify([{ name: "Dax", code: "40088", postalCode: "40100" }]),
  });
  const manual = await createGroupeInstructeurs(db, { name: "DGALN" });
  await page.route("https://geo.api.gouv.fr/communes?*", (route) =>
    route.fulfill({
      json: [{ nom: "Dax", code: "40088", codesPostaux: ["40100"], codeDepartement: "40" }],
    }),
  );
  await loginAs(actor.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await page.getByRole("button", { name: "Créer un groupe", exact: true }).click();
  const editor = page.getByRole("region", { name: "Modifier le groupe", exact: true });
  await editor.getByLabel("Nom du groupe").fill("Photovoltaïque Dax");
  await editor.getByRole("button", { name: "Ajouter une règle" }).click();
  await editor.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
  await editor.getByRole("option", { name: "Département principal", exact: true }).click();
  await editor.getByRole("button", { name: "Sélectionner des départements", exact: true }).click();
  await editor.getByText("40 - Landes", { exact: true }).click();
  await editor.getByRole("button", { name: "40 - Landes", exact: true }).click();
  await editor.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
  await editor.getByRole("option", { name: "Communes du projet", exact: true }).click();
  await editor.getByLabel("Rechercher une commune").fill("Dax");
  await editor.getByRole("button", { name: "Dax (40100)", exact: true }).click();
  await editor.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
  await editor.getByRole("option", { name: "Activité principale", exact: true }).click();
  await editor.getByRole("button", { name: "Sélectionner des activités", exact: true }).click();
  await editor
    .getByText("Production énergie renouvelable - Photovoltaïque", { exact: true })
    .click();
  await expect(editor.getByRole("button", { name: "Enregistrer", exact: true })).toHaveCount(0);
  await editor.getByRole("button", { name: "Vérifier les affectations" }).click();
  const preview = editor.getByRole("region", { name: "Aperçu des affectations" });
  await expect(preview.locator("dl > div").filter({ hasText: "Dossiers ajoutés" })).toContainText(
    "1",
  );
  await expect(preview.locator("dl > div").filter({ hasText: "Dossiers retirés" })).toContainText(
    "0",
  );
  await preview.locator("summary").click();
  await expect(preview.getByRole("link", { name: /Projet solaire/u })).toBeVisible();
  await editor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const group = await db("groupe_instructeurs").where({ name: "Photovoltaïque Dax" }).first();
  expect(await db("groupe_regle").where({ groupe_instructeurs: group.id })).toMatchObject([
    { departments: ["40"], communes: ["40088"], activites: ["energie-photovoltaique"] },
  ]);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
  await page.getByRole("tab", { name: "Accès au dossier", exact: true }).click();
  const assignments = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
  const automatic = assignments.getByRole("article", { name: "Photovoltaïque Dax", exact: true });
  await automatic.getByText("Détails de l'affectation", { exact: true }).click();
  await expect(automatic.getByText("40 · Landes", { exact: true })).toBeVisible();
  await automatic
    .getByRole("button", { name: "Modifier l'affectation de Photovoltaïque Dax" })
    .click();
  const assignmentEditor = automatic.getByRole("form");
  await chooseInSelect(assignmentEditor.getByRole("combobox"), "Exclure durablement");
  await assignmentEditor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(assignmentEditor).toHaveCount(0);
  await expect(assignments).toContainText("Exclusion manuelle");
  await assignments.getByRole("button", { name: "Ajouter un groupe", exact: true }).click();
  await assignments.getByRole("combobox", { name: /^Groupe instructeur/u }).click();
  await page.getByRole("option", { name: "DGALN", exact: true }).click();
  await assignments.getByRole("button", { name: "Ajouter le groupe", exact: true }).click();
  await expect(assignments).toContainText("Ajout manuel");
  await db("dossier").where({ id: dossier.id }).update({ primary_department: "75" });
  await page.reload();
  await page.getByRole("tab", { name: "Accès au dossier", exact: true }).click();
  await expect(assignments).toContainText("DGALN");
  await expect(assignments).toContainText("Exclusion manuelle");
  expect(
    await db("edge_groupe_instructeurs__dossier")
      .where({ dossier: dossier.id })
      .pluck("groupe_instructeurs"),
  ).toEqual([manual.id]);
  await page.setViewportSize({ width: 320, height: 844 });
  await assignments.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.screenshot({ path: testInfo.outputPath("routing-exceptions-mobile.png") });
});
