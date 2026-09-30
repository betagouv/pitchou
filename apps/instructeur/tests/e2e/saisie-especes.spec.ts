import { test, expect } from "../fixtures/playwright.ts";
import type { Page } from "@playwright/test";

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

async function expectContainedForm(page: Page) {
  const overflow = await page.locator("article").evaluate((article) => {
    const bounds = article.getBoundingClientRect();
    return [...article.querySelectorAll("fieldset, input, button, summary")]
      .filter((element) => element.getClientRects().length > 0)
      .filter((element) => !element.closest("dialog, .fr-collapse"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
      })
      .map((element) => element.id || element.textContent?.trim());
  });
  expect(overflow).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

for (const width of [320, 375, 768, 1440]) {
  test(`les options longues restent dans le formulaire à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/especes-protegees", (route) =>
      route.fulfill({
        json: [
          {
            cd_ref: "60902",
            classification: "faune non-oiseau",
            noms_scientifiques: ["Ursus arctos"],
            noms_vernaculaires: ["Ours brun"],
            cd_type_statuts: ["PN"],
            statuts_protection: [],
          },
          {
            cd_ref: "4221",
            classification: "oiseau",
            noms_scientifiques: ["Sylvia undata"],
            noms_vernaculaires: ["Fauvette pitchou"],
            cd_type_statuts: ["PN"],
            statuts_protection: [],
          },
        ],
      }),
    );
    await page.goto("/saisie-especes");
    await expectContainedForm(page);

    const species = page.getByRole("combobox", { name: "Espèce", exact: true });
    await species.fill("Ours brun");
    await page.getByRole("option", { name: "Ours brun (Ursus arctos)", exact: true }).click();
    await page.getByRole("combobox", { name: "Type d’impact", exact: true }).click();
    await page.getByRole("option", { name: "Destruction/mutilation de spécimens" }).click();
    await expectContainedForm(page);

    const method = page.getByRole("combobox", { name: "Méthode", exact: true });
    await method.click();
    const longOption = page.getByRole("option", { name: /^Pour les mammifères/ });
    const methodLabel = await longOption.textContent();
    const optionBounds = await longOption.boundingBox();
    expect(optionBounds!.x).toBeGreaterThanOrEqual(0);
    expect(optionBounds!.x + optionBounds!.width).toBeLessThanOrEqual(width);
    await longOption.click();
    await expect(method).toContainText(methodLabel!);
    await expectContainedForm(page);

    await page.getByText("Voir le détail de la méthode", { exact: true }).click();
    await expect(page.locator("details[open] p")).toHaveText(methodLabel!);
    await expectContainedForm(page);

    await page.getByRole("combobox", { name: "Moyen de poursuite", exact: true }).click();
    await page
      .getByRole("option", { name: "Véhicules à moteur en mouvement", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Nombre d’individus" }).click();
    await page.getByRole("option", { name: "11-100", exact: true }).click();
    await page.getByRole("button", { name: "Ajouter un autre impact" }).click();
    await expect(
      page.getByRole("combobox", { name: "Type d’impact", exact: true }).nth(1),
    ).toBeFocused();
    await expectContainedForm(page);
    await page.getByRole("button", { name: "Supprimer l'impact #2 sur l'espèce #1" }).click();
    await expect(method).toContainText(methodLabel!);

    await page.getByRole("button", { name: "Ajouter une espèce", exact: true }).click();
    await species.nth(1).fill("Fauvette");
    await page
      .getByRole("option", { name: "Fauvette pitchou (Sylvia undata)", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Type d’impact", exact: true }).nth(1).click();
    await page
      .getByRole("option", { name: "Capture pour captivité temporaire ou définitive" })
      .click();
    await page.getByRole("combobox", { name: "Méthode", exact: true }).nth(1).click();
    await page.getByRole("option", { name: /^Par une des méthodes suivantes/ }).click();
    await page.getByRole("spinbutton", { name: "Nids", exact: true }).fill("2");
    await page.getByRole("spinbutton", { name: "Œufs", exact: true }).fill("3");
    await page.getByRole("spinbutton", { name: "Surface habitat détruit (m²)" }).fill("42");
    await expectContainedForm(page);

    await page.getByText("Mode lecture", { exact: true }).click();
    await expect(page.getByLabel("Mode lecture")).toBeChecked();
    await expect(page.getByText("Mode lecture activé :", { exact: false })).toBeVisible();
    await page.getByText("Mode lecture", { exact: true }).click();
    await expect(method.first()).toContainText(methodLabel!);
    await expect(page.getByRole("spinbutton", { name: "Nids", exact: true })).toHaveValue("2");
    await expectContainedForm(page);
  });
}
