import { loginBrowser } from "../helpers/browserAuth.ts";
import { test, expect } from "../fixtures/playwright.ts";
import { createPersonne } from "../factories/index.ts";

test("la page de connexion s'affiche quand on visite / sans secret", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toContainText("Pitchou");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connexion");
  await expect(page.getByRole("link", { name: "S'identifier avec ProConnect" })).toBeVisible();
});

test("un ancien secret ne connecte plus un utilisateur", async ({ page }) => {
  await page.goto("/?secret=inexistant");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connexion");
  await expect(page.getByRole("link", { name: "S'identifier avec ProConnect" })).toBeVisible();
});

test("un compte sans groupe d'instructeurs affiche l'erreur correspondante", async ({
  page,
  db,
}) => {
  const { codeAcces } = await createPersonne(db, {
    email: "jane@doe.fr",
    access_code: "test.pas.de.groupe",
  });

  await loginBrowser(page, db, codeAcces);

  await expect(page).toHaveURL(/\/auth\/acces-refuse$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Votre accès aux dossiers");
  await expect(
    page.getByText(
      "Votre compte est enregistré, mais vous ne pouvez pas encore consulter les dossiers.",
    ),
  ).toBeVisible();
});
