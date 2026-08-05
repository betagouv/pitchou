import { test, expect } from "../fixtures/playwright.ts";

test("la page Référentiel liste les types d'impact, méthodes et moyens de poursuite", async ({
  page,
}) => {
  await page.goto("/referentiel-type-impact");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Référentiel des types d’impact",
  );

  const tables = page.locator("table");
  await expect(tables).toHaveCount(3);
  await expect(tables.nth(0).locator("tbody tr")).toHaveCount(21);
  await expect(tables.nth(1).locator("tbody tr")).toHaveCount(8);
  await expect(tables.nth(2).locator("tbody tr")).toHaveCount(8);
});

test("filtrer sur une classification ne montre que ce qui est proposé pour elle", async ({
  page,
}) => {
  await page.goto("/referentiel-type-impact");

  await page.getByLabel("Classification d’espèce").selectOption("oiseau");

  await expect(page.locator("table").nth(0).locator("tbody tr")).toHaveCount(10);
  await expect(page.locator("table").nth(1).locator("tbody tr")).toHaveCount(3);
  await expect(page.locator("table").nth(2).locator("tbody tr")).toHaveCount(5);

  // La flore n'a ni méthode ni moyen de poursuite : les tableaux cèdent la place à un message.
  await page.getByLabel("Classification d’espèce").selectOption("flore");

  await expect(page.locator("table").nth(0).locator("tbody tr")).toHaveCount(2);
  await expect(page.getByText("Aucune méthode ne s’applique")).toBeVisible();
  await expect(page.getByText("Aucun moyen de poursuite ne s’applique")).toBeVisible();
});

test("le détail d'un type d'impact donne le libellé européen et les activités Onagre", async ({
  page,
}) => {
  await page.goto("/referentiel-type-impact");

  // Les deux colonnes que le formulaire de saisie n'affiche pas, et pour lesquelles cette page
  // existe.
  await page
    .getByRole("button", { name: "Voir le détail de Capture/relâcher immédiat" })
    .first()
    .click();

  const modal = page.getByRole("dialog");
  await expect(modal).toContainText("Libellé de la directive européenne");
  await expect(modal).toContainText("Activités Onagre correspondantes");
  await expect(modal).toContainText("Capture et marquage (baguage)");
});

test("la page de saisie renvoie vers le référentiel", async ({ page }) => {
  await page.goto("/saisie-especes");

  const lienAide = page.getByRole("link", {
    name: /Quels types d'impact existe-t-il/,
  });

  await expect(lienAide).toBeVisible();
  await expect(lienAide).toHaveAttribute("href", "/referentiel-type-impact");
  // Nouvel onglet : la saisie en cours vit en mémoire et serait perdue en quittant la page.
  await expect(lienAide).toHaveAttribute("target", "_blank");
});
