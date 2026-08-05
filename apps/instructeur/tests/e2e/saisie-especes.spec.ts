import { test, expect } from "../fixtures/playwright.ts";

test("la page Saisie des espèces s'affiche correctement", async ({ page }) => {
  await page.goto("/saisie-especes");

  await expect(page.getByRole("banner")).toContainText("Pitchou");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Espèces protégées impactées",
  );
  await expect(page.getByRole("button", { name: "Pré-remplir", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Espèce" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Valider ma saisie" })).toBeVisible();
});

test("le référentiel des types d'impact est servi depuis la base", async ({ request }) => {
  // The only CI job with a migrated database and a running server, so this is where the whole
  // chain — migration, tables, query, route — gets exercised. The page above needs it: without
  // this referential the Type d'impact, Méthode and Moyen de poursuite dropdowns stay empty.
  const response = await request.get("/api/referentiel-type-impact-methode-moyen-de-poursuite");

  expect(response.status()).toBe(200);

  const { typesImpact, methodes, moyensDePoursuite } = await response.json();
  expect(typesImpact).toHaveLength(21);
  expect(methodes).toHaveLength(8);
  expect(moyensDePoursuite).toHaveLength(8);
});
