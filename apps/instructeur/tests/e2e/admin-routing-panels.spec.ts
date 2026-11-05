import { saveAccessForm } from "../helpers/saveAccess.ts";
import { changeAssignments, changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { expect, test } from "../fixtures/playwright.ts";
import { chooseInSelect } from "../helpers/select.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("routing saves refresh assignments and effective access without losing dossier edits", async ({
  page,
  db,
  loginAs,
}) => {
  // Several persisted routing changes and page refreshes share this scenario.
  test.setTimeout(60_000);
  const administrator = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  const member = await createInstructeurWithCapToGroup(db, {
    email: "instructeur@example.org",
    nomGroupe: "Service Paris",
  });
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_departement").insert({
        groupe_instructeurs: member.groupeId,
        department: "75",
      }),
    { silent: true },
  );
  const dossier = await createDossier(db, {
    name: "Projet à réaffecter",
    source: "pitchou",
    demarche_number: null,
    primary_department: "33",
  });
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").insert({
      dossier: dossier.id,
      user_id: member.id,
      access_level: "read",
    }),
  );
  await loginAs(administrator.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
  const dossierTab = page.getByRole("tab", { name: "Dossier", exact: true });
  const accessTab = page.getByRole("tab", { name: "Accès au dossier", exact: true });
  await accessTab.click();
  const assignments = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
  const access = page.getByRole("region", { name: "Accès individuels au dossier" });
  const person = access.getByRole("article", { name: "Accès de instructeur@example.org" });
  const effectiveAccess = person.getByText(/^Accès effectif/u);
  await expect(assignments).toContainText("Ce dossier n'est affecté à aucun groupe.");
  await expect(person).toContainText("Lecture complète");
  await expect(effectiveAccess).toHaveCount(0);

  await dossierTab.click();
  await page.locator('label[for="demandeur-physical"]').click();
  await page.locator("#physical-last-name").fill("Martin");
  await page.locator("#physical-first-names").fill("Camille");
  await page.locator("#location-primary-department").click();
  await page.getByRole("option", { name: "75 – Paris", exact: true }).click();
  await page.locator("header").getByRole("button", { name: "Enregistrer", exact: true }).click();
  await accessTab.click();
  await expect(assignments.getByRole("heading", { name: "Service Paris" })).toBeVisible();
  await assignments.getByText("Détails de l'affectation", { exact: true }).click();
  await expect(assignments.getByText("75 · Paris", { exact: true })).toBeVisible();
  await expect(effectiveAccess).toContainText("Instruction");

  // The form must keep edits made before a group assignment refreshes the page data.
  await dossierTab.click();
  await page.locator("#project-name").fill("Modification non enregistrée");
  await accessTab.click();
  const group = assignments.getByRole("article", { name: "Service Paris", exact: true });
  const edit = group.getByRole("button", { name: "Modifier l'affectation de Service Paris" });
  const form = group.getByRole("form", { name: "Modifier l'affectation de Service Paris" });
  const mode = form.getByRole("combobox", { name: "Mode d'affectation de Service Paris" });
  await edit.click();
  await chooseInSelect(mode, "Exclure durablement");
  await expect(effectiveAccess).toContainText("Instruction");
  await saveAccessForm(page, form, `/api/dossiers/${dossier.id}/affectations`);
  await expect(effectiveAccess).toHaveCount(0);
  await expect(group).toContainText("Exclusion manuelle");
  await expect(accessTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#project-name")).toHaveValue("Modification non enregistrée");
  await edit.click();
  await chooseInSelect(mode, "Inclure manuellement");
  await saveAccessForm(page, form, `/api/dossiers/${dossier.id}/affectations`);
  await expect(effectiveAccess).toContainText("Instruction");
  await expect(group).toContainText("Ajout manuel");
  await edit.click();
  await form.getByRole("radio", { name: /^Lecture complète/u }).check();
  await expect(effectiveAccess).toContainText("Instruction");
  await saveAccessForm(page, form, `/api/dossiers/${dossier.id}/affectations`);
  await expect(effectiveAccess).toHaveCount(0);
  await expect(
    group.locator(".access-row-heading").getByText("Lecture complète", { exact: true }),
  ).toBeVisible();
  await expect(accessTab).toHaveAttribute("aria-selected", "true");
  await dossierTab.click();
  await expect(page.locator("#project-name")).toBeVisible();
  await expect(page.locator("#project-name")).toHaveValue("Modification non enregistrée");
  expect((await db("dossier").where({ id: dossier.id }).first()).name).toBe("Projet à réaffecter");
});
