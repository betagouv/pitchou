import { test, expect } from "../fixtures/playwright.ts";
import {
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

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
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom du groupe").fill("Photovoltaïque Dax");
  await dialog.getByRole("button", { name: "Ajouter une règle" }).click();
  await dialog.getByText("Département principal, au choix", { exact: true }).click();
  await dialog.getByText("40 - Landes", { exact: true }).click();
  await dialog.getByLabel("ET communes du projet, au choix").fill("Dax");
  await dialog.getByRole("button", { name: "Dax (40100)", exact: true }).click();
  await dialog.getByText("ET activité principale, au choix", { exact: true }).click();
  await dialog
    .getByText("Production énergie renouvelable - Photovoltaïque", { exact: true })
    .click();
  await expect(dialog.getByRole("button", { name: "Enregistrer", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Vérifier les affectations" }).click();
  const preview = dialog.getByRole("region", { name: "Aperçu des affectations" });
  await expect(preview).toContainText("1 dossier(s) ajouté(s), 0 dossier(s) retiré(s)");
  await preview.locator("summary").click();
  await expect(preview.getByRole("link", { name: /Projet solaire/u })).toBeVisible();
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const group = await db("groupe_instructeurs").where({ name: "Photovoltaïque Dax" }).first();
  expect(await db("groupe_regle").where({ groupe_instructeurs: group.id })).toMatchObject([
    { departments: ["40"], communes: ["40088"], activites: ["energie-photovoltaique"] },
  ]);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
  const assignments = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
  await expect(assignments).toContainText("Correspondance automatique");
  await assignments.getByLabel("Mode d'affectation de Photovoltaïque Dax").selectOption("exclude");
  await expect(assignments).toContainText("Exclusion manuelle");
  await assignments.getByLabel("Ajouter un groupe manuellement").selectOption(manual.id);
  await assignments.getByRole("button", { name: "Affecter au groupe" }).click();
  await expect(assignments).toContainText("Ajout manuel");
  await db("dossier").where({ id: dossier.id }).update({ primary_department: "75" });
  await page.reload();
  await expect(assignments).toContainText("DGALN");
  await expect(assignments).toContainText("Exclusion manuelle");
  expect(
    await db("edge_groupe_instructeurs__dossier")
      .where({ dossier: dossier.id })
      .pluck("groupe_instructeurs"),
  ).toEqual([manual.id]);
  await page.setViewportSize({ width: 390, height: 844 });
  await assignments.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath("routing-exceptions-mobile.png") });
});
