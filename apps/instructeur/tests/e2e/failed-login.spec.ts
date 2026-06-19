import { test, expect } from "../fixtures/playwright.ts";
import { createPersonne } from "../factories/index.ts";

test("la page de connexion s'affiche quand on visite / sans secret", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toContainText("Pitchou");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connexion");
  await expect(page.getByLabel("Adresse email")).toBeVisible();
});

test("un secret inexistant affiche une erreur de connexion invalide", async ({ page }) => {
  await page.goto("/?secret=inexistant");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connexion");
  await expect(page.getByText("Votre lien de connexion n'est plus valide")).toBeVisible();
});

test("un compte sans groupe d'instructeurs affiche l'erreur correspondante", async ({
  page,
  db,
}) => {
  const { codeAcces } = await createPersonne(db, {
    email: "jane@doe.fr",
    code_accès: "test.pas.de.groupe",
  });

  await page.goto(`/?secret=${codeAcces}`);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connexion");
  await expect(
    page.getByText(`Erreur : Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs`),
  ).toBeVisible();
});
