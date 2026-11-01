import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

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
  await dialog.getByLabel("Niveau d'accès de la règle 1").selectOption("read");
  await dialog.getByText("Département principal, au choix", { exact: true }).click();
  await dialog.getByText("75 - Paris", { exact: true }).click();
  await dialog.getByRole("button", { name: "Vérifier les affectations" }).click();
  await expect(dialog.getByRole("region", { name: "Aperçu des affectations" })).toContainText(
    "1 dossier(s) ajouté(s)",
  );
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
  const assignments = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
  await expect(assignments).toContainText("Niveau accordé : Lecture complète");
  await assignments.getByLabel("Mode d'affectation de Lecture Paris").selectOption("include");
  await expect(assignments.getByLabel("Niveau d'accès manuel de Lecture Paris")).toHaveValue(
    "read",
  );
  await expect(assignments).toContainText("Niveau accordé : Lecture complète");
  const access = page.getByRole("region", { name: "Accès individuels au dossier" });
  await access
    .getByLabel("Accorder un accès individuel", { exact: true })
    .selectOption(String(user.id));
  await access.getByRole("button", { name: "Accorder l'accès", exact: true }).click();
  await expect(access).toContainText("Origine : accès individuel manuel · Lecture complète");
  await expect(access).toContainText(
    "Accès effectif, tous groupes et permissions compris : Lecture complète",
  );
  expect(await db("user_groupe").where({ user_id: user.id })).toHaveLength(0);
  await access
    .getByLabel("Niveau d'accès de lecture@example.org", { exact: true })
    .selectOption("instruct");
  await expect(access).toContainText("Origine : accès individuel manuel · Instruction");
  expect(
    await db("dossier_user_access").where({ dossier: dossier.id, user_id: user.id }),
  ).toMatchObject([{ access_level: "instruct" }]);
  await access
    .getByRole("button", { name: "Révoquer l'accès individuel de lecture@example.org" })
    .click();
  await expect(access).toContainText("Aucun accès individuel.");
  expect(
    await db("dossier_user_access").where({ dossier: dossier.id, user_id: user.id }),
  ).toHaveLength(0);
});
