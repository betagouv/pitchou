import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("local admin permissions grant notification monitoring, search and history", async ({
  page,
  db,
  loginAs,
}) => {
  const owner = await createInstructeurWithDossier(db, { email: "notification-admin@example.org" });
  await db("auth_permission").insert({ user_id: owner.id, permission: "admin:access" });
  const [row] = await db("email_notification_outbox")
    .insert({
      personne: owner.id,
      dossier: owner.dossier.id,
      kind: "novelty",
      batch_key: "browser-check",
      due_at: new Date(),
    })
    .returning("id");
  await loginAs(owner.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/mails/notifications`);
  await expect(
    page.getByRole("heading", { name: "Notifications par mail", exact: true }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", {
    name: "Rechercher un dossier, un destinataire ou une notification",
  });
  await search.fill(row.id);
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tableau des envois" })).toContainText(owner.email);
  await page.getByRole("link", { name: `Historique de la notification ${row.id}` }).click();
  await expect(
    page.getByRole("heading", { name: "Historique de la notification", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".history-timeline")).toContainText("Mise en file");
  await page.getByRole("link", { name: "Fermer l'historique" }).click();
  await expect(
    page.getByRole("heading", { name: "Historique de la notification", exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/notification=(?:&|$)/u);
  await search.fill("no-matching-notification");
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aucun envoi trouvé" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Filtres", exact: true }).click();
  await page.getByRole("link", { name: "Réinitialiser les filtres", exact: true }).click();
  await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/mails/notifications`);
  await expect(page.getByRole("region", { name: "Tableau des envois" })).toContainText(owner.email);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
