import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";

test("un dossier se marque comme lu et non lu depuis la tuile et l'entête", async ({
  page,
  db,
  loginAs,
}) => {
  const {
    codeAcces,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@non-lu.fr",
    dossierNom: "Dossier non lu e2e",
  });
  await attachPersonneSuitDossier(db, personneId, dossier.id);
  await db("notification").insert({ personne: personneId, dossier: dossier.id, viewed: false });

  await loginAs(codeAcces);
  await page.goto("/mes-dossiers");
  const card = page.getByTestId("card-dossier").filter({ hasText: dossier.name! });
  const badge = card.locator("p.fr-badge--new");
  await expect(badge).toBeVisible();

  // The tile menu marks the dossier as read, the modification badge disappears.
  await card.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Marquer le dossier comme lu" }).click();
  await expect(badge).toBeHidden();

  // And back to unread.
  await card.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Marquer le dossier comme non lu" }).click();
  await expect(badge).toBeVisible();

  // The dossier header toggles the same state and it persists.
  await page.goto(`/dossier/${dossier.id}`);
  await page.getByRole("button", { name: "Marquer le dossier comme lu" }).click();
  await expect(page.getByRole("button", { name: "Marquer le dossier comme non lu" })).toBeVisible();
  await page.getByRole("button", { name: "Marquer le dossier comme non lu" }).click();
  await expect(page.getByRole("button", { name: "Marquer le dossier comme lu" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.goto("/mes-dossiers");
  await expect(badge).toBeVisible();
});
