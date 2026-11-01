import { loginBrowser } from "../helpers/browserAuth.ts";
import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("personal following changes Mes dossiers without exposing an assignment action", async ({
  page,
  db,
}) => {
  const actor = await createInstructeurWithDossier(db, {
    email: "self-follow@test.fr",
    codeAcces: "self-follow-code",
    dossierNom: "Projet suivi personnel",
  });
  await loginBrowser(page, db, actor.codeAcces);
  await page.goto(`/dossier/${actor.dossier.id}`);
  await page.getByRole("button", { name: "Suivre ce dossier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Vous suivez ce dossier" })).toBeVisible();
  await page.getByRole("button", { name: /Plus d’actions/u }).click();
  await expect(page.getByRole("menuitem", { name: "Faire suivre le dossier" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/mes-dossiers");
  const card = page.getByTestId("card-dossier").filter({ hasText: actor.dossier.name! });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Ne plus suivre", exact: true }).click();
  await expect(card).toHaveCount(0);
  expect(
    await db("edge_personne_follows_dossier").where({
      dossier: actor.dossier.id,
      personne: actor.id,
    }),
  ).toHaveLength(0);
});
