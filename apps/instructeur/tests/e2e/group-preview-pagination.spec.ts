import { changeAssignments } from "@pitchou/server/dossierRouting.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { expect, test } from "../fixtures/playwright.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("preview pages remain bounded, recover from errors and reject stale assignments", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const actor = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier").insert(
      Array.from({ length: 107 }, (_, index) => ({
        name: `Projet ${String(index + 1).padStart(3, "0")}`,
        source: "demarche_numerique",
        demarche_number: 88444,
        primary_department: "75",
      })),
    ),
  );
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ colorScheme: "dark" });
  await loginAs(actor.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await page.getByRole("button", { name: "Créer un groupe", exact: true }).click();
  const editor = page.getByRole("region", { name: "Modifier le groupe", exact: true });
  await editor.getByLabel("Nom du groupe").fill("Paris");
  await page.getByRole("tab", { name: /Règles/u }).click();
  await editor.getByRole("button", { name: "Ajouter une règle", exact: true }).click();
  await editor.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
  await editor.getByRole("option", { name: "Département principal", exact: true }).click();
  await editor.getByRole("button", { name: "Sélectionner des départements", exact: true }).click();
  await editor.getByText("75 - Paris", { exact: true }).click();
  await page.keyboard.press("Escape");
  await editor.getByRole("button", { name: "Vérifier les affectations" }).click();
  await editor.locator("summary").filter({ hasText: "Dossiers ajoutés" }).click();
  const category = editor.locator("details").filter({ hasText: "Dossiers ajoutés" });
  const navigation = category.getByRole("navigation", { name: "Pagination : Dossiers ajoutés" });
  await expect(category.locator("li")).toHaveCount(25);
  await expect(category).toContainText("Dossiers 1 à 25 sur 107");
  await expect(
    navigation.getByRole("button", { name: "Page précédente", exact: true }),
  ).toBeDisabled();
  let failNext = true;
  await page.route("**/api/groupes-instructeurs/apercu?*", async (route) => {
    if (failNext) {
      failNext = false;
      await route.fulfill({ status: 503, json: { message: "Chargement impossible. Réessayez." } });
    } else await route.continue();
  });
  await navigation.getByRole("button", { name: "Page suivante", exact: true }).click();
  await expect(category.getByRole("alert")).toContainText("Réessayez");
  await expect(category).toContainText("Dossiers 1 à 25 sur 107");
  await navigation.getByRole("button", { name: "Page suivante", exact: true }).click();
  await expect(category).toContainText("Dossiers 26 à 50 sur 107");
  await expect(category.locator("li")).toHaveCount(25);
  await expect(category.locator("li").first()).toContainText("Projet 026");
  await navigation.getByRole("button", { name: "Dernière page", exact: true }).click();
  await expect(category).toContainText("Dossiers 101 à 107 sur 107");
  await expect(category.locator("li")).toHaveCount(7);
  await expect(
    navigation.getByRole("button", { name: "Page suivante", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("preview-pagination-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await navigation.scrollIntoViewIfNeeded();
  const box = (await navigation.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("preview-pagination-mobile.png") });
  await navigation.getByRole("button", { name: "Première page", exact: true }).click();
  await expect(category).toContainText("Dossiers 1 à 25 sur 107");
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier").where({ name: "Projet 107" }).update({ primary_department: "69" }),
  );
  await navigation.getByRole("button", { name: "Page suivante", exact: true }).click();
  await expect(category.getByRole("alert")).toContainText("Actualisez l'aperçu");
  await expect(editor.getByRole("button", { name: "Enregistrer", exact: true })).toBeDisabled();
  await expect(category).toContainText("Dossiers 1 à 25 sur 107");
  await editor.getByRole("button", { name: "Revenir à l'édition", exact: true }).click();
  await editor.getByRole("button", { name: "Vérifier les affectations" }).click();
  await expect(editor.getByRole("button", { name: "Enregistrer", exact: true })).toBeEnabled();
  await expect(editor.locator("summary").filter({ hasText: "Dossiers ajoutés" })).toContainText(
    "106",
  );
});
