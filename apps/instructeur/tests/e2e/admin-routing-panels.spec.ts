import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("routing saves refresh assignments and effective access without losing dossier edits", async ({
  page,
  db,
  loginAs,
}) => {
  const administrator = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  const member = await createInstructeurWithCapToGroup(db, {
    email: "instructeur@example.org",
    nomGroupe: "Service Paris",
  });
  await db("groupe_departement").insert({
    groupe_instructeurs: member.groupeId,
    department: "75",
  });
  const dossier = await createDossier(db, {
    name: "Projet à réaffecter",
    source: "pitchou",
    demarche_number: null,
    primary_department: "33",
  });
  await db("dossier_user_access").insert({
    dossier: dossier.id,
    user_id: member.id,
    access_level: "read",
  });
  await loginAs(administrator.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
  const assignments = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
  const access = page.getByRole("region", { name: "Accès individuels au dossier" });
  const effectiveAccess = access.getByText("Accès effectif, tous groupes et permissions compris", {
    exact: false,
  });
  await expect(assignments).toContainText("Ce dossier n'est affecté à aucun groupe.");
  await expect(effectiveAccess).toContainText("Lecture complète");

  await page.locator('label[for="demandeur-physical"]').click();
  await page.locator("#physical-last-name").fill("Martin");
  await page.locator("#physical-first-names").fill("Camille");
  await page.locator("#location-primary-department").click();
  await page.getByRole("option", { name: "75 – Paris", exact: true }).click();
  await page.locator("header").getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(assignments.getByRole("heading", { name: "Service Paris" })).toBeVisible();
  await expect(assignments).toContainText("Correspondance automatique");
  await expect(effectiveAccess).toContainText("Instruction");

  // The form must keep edits made before a group assignment refreshes the page data.
  await page.locator("#project-name").fill("Modification non enregistrée");
  const mode = assignments.getByLabel("Mode d'affectation de Service Paris");
  await mode.selectOption("exclude");
  await expect(effectiveAccess).toContainText("Lecture complète");
  await expect(mode).toHaveValue("exclude");
  await expect(page.locator("#project-name")).toHaveValue("Modification non enregistrée");
  await mode.selectOption("include");
  await expect(effectiveAccess).toContainText("Instruction");
  await expect(mode).toHaveValue("include");
  await assignments.getByLabel("Niveau d'accès manuel de Service Paris").selectOption("read");
  await expect(effectiveAccess).toContainText("Lecture complète");
  await expect(page.locator("#project-name")).toHaveValue("Modification non enregistrée");
  expect((await db("dossier").where({ id: dossier.id }).first()).name).toBe("Projet à réaffecter");
});
