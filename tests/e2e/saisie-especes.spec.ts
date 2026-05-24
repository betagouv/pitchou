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
