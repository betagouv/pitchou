import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";
import { chooseInSelect } from "../helpers/select.ts";

test("an admin edits rule levels and grants a person access without group membership", async ({
  page,
  db,
  loginAs,
}) => {
  const actor = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
  const dossier = await createDossier(db, { name: "Projet en lecture", primary_department: "75" });
  const [user] = await db("auth_user")
    .insert({ email: "lecture@example.org", permissions_configured: true })
    .returning("*");
  await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
  await loginAs(actor.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await page.getByRole("button", { name: "Créer un groupe", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom du groupe").fill("Lecture Paris");
  await dialog.getByRole("button", { name: "Ajouter une règle" }).click();
  await dialog.getByRole("combobox", { name: "Niveau d'accès de la règle 1" }).click();
  await dialog.getByRole("option", { name: "Lecture complète", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
  await dialog.getByRole("option", { name: "Département principal", exact: true }).click();
  await dialog.getByRole("button", { name: "Sélectionner des départements", exact: true }).click();
  await dialog.getByText("75 - Paris", { exact: true }).click();
  await dialog.getByRole("button", { name: "Vérifier les affectations" }).click();
  await expect(
    dialog
      .getByRole("region", { name: "Aperçu des affectations" })
      .locator("dl > div")
      .filter({ hasText: "Dossiers ajoutés" }),
  ).toContainText("1");
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Modifier Lecture Paris", exact: true }),
  ).toContainText("1 règle(s), dont 1 en lecture complète");
  const group = await db("groupe_instructeurs").where({ name: "Lecture Paris" }).first();
  expect(await db("groupe_departement").where({ groupe_instructeurs: group.id })).toHaveLength(0);
  expect(await db("groupe_regle").where({ groupe_instructeurs: group.id })).toMatchObject([
    { access_level: "read" },
  ]);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
  await page.getByRole("tab", { name: "Accès au dossier", exact: true }).click();
  const assignments = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
  const groupRow = assignments.getByRole("article", { name: "Lecture Paris", exact: true });
  await expect(groupRow.getByText("Lecture complète", { exact: true })).toBeVisible();
  await groupRow.getByRole("button", { name: "Modifier l'affectation de Lecture Paris" }).click();
  const groupForm = groupRow.getByRole("form");
  await chooseInSelect(groupForm.getByRole("combobox"), "Inclure manuellement");
  await expect(groupForm.getByRole("radio", { name: /^Lecture complète/u })).toBeChecked();
  await groupForm.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(groupForm).toHaveCount(0);
  await expect(groupRow.getByText("Lecture complète", { exact: true })).toBeVisible();
  const access = page.getByRole("region", { name: "Accès individuels au dossier" });
  await access.getByRole("button", { name: "Ajouter une personne", exact: true }).click();
  await access.getByRole("combobox", { name: /^Personne/u }).click();
  await page.getByRole("option", { name: "lecture@example.org", exact: true }).click();
  await access.getByRole("button", { name: "Accorder l'accès", exact: true }).click();
  const person = access.getByRole("article", { name: "Accès de lecture@example.org" });
  await expect(person.getByText("Lecture complète", { exact: true })).toBeVisible();
  await expect(person.getByText(/^Accès effectif/u)).toHaveCount(0);
  expect(
    (await db.raw("select pitchou_dossier_access(?, ?) as level", [dossier.id, user.id])).rows[0]
      .level,
  ).toBe("lecture_complete");
  expect(await db("user_groupe").where({ user_id: user.id })).toHaveLength(0);
  const edit = person.getByRole("button", { name: "Modifier l'accès de lecture@example.org" });
  await edit.click();
  await person.getByRole("radio", { name: /^Instruction/u }).check();
  await person.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(person.getByRole("form")).toHaveCount(0);
  await expect(person.getByText("Instruction", { exact: true })).toBeVisible();
  expect(
    await db("dossier_user_access").where({ dossier: dossier.id, user_id: user.id }),
  ).toMatchObject([{ access_level: "instruct" }]);
  await edit.click();
  await person
    .getByRole("button", { name: "Révoquer l'accès individuel de lecture@example.org" })
    .click();
  await expect(access).toContainText("Aucun accès individuel.");
  expect(
    await db("dossier_user_access").where({ dossier: dossier.id, user_id: user.id }),
  ).toHaveLength(0);
});
