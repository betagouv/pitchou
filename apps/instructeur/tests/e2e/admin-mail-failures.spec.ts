import { randomUUID } from "node:crypto";
import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("admins can filter delivery failures and inspect the provider reason without changing accounts", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const admin = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  const dossier = await createDossier(db, { name: "Extension du projet de Tours" });
  await db("email_notification_outbox").delete();
  const now = new Date();
  const recipients = [
    "marie@example.org",
    "celine@example.org",
    "louise@example.org",
    "frederic@example.org",
  ];
  for (const [index, recipient] of recipients.entries()) {
    const id = randomUUID();
    const providerMessageId = `<delivery-${index}@smtp-relay.mailin.fr>`;
    await db("email_notification_outbox").insert({
      id,
      personne: admin.id,
      dossier: dossier.id,
      kind: "arrival",
      batch_key: randomUUID(),
      due_at: now,
      environment: "production",
      attempt_count: 1,
      message: {
        to: [recipient],
        subject: "Nouveau dossier : Extension du projet de Tours",
        htmlContent: "<p>Nouveau dossier</p>",
      },
    });
    await db("email_notification_outbox").where({ id }).update({
      status: "sent",
      sent_at: now,
      provider_message_id: providerMessageId,
    });
    await db("email_issue_notification").insert({
      id: randomUUID(),
      issue: {
        type: index === 3 ? "blocked" : "hard_bounce",
        recipient,
        environment: "pitchou-env-production",
        providerMessageId,
        occurredAt: new Date().toISOString(),
        reason:
          index === 3
            ? "blocked : due to blacklist user"
            : '554 5.7.1 Recipient address rejected: 511 "User Unknown"',
      },
    });
  }
  await loginAs(admin.codeAcces);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(E2E_ADMIN_BASE_URL + "/mails");
  await expect(page.locator('.summary-card[data-status="uncertain"] strong')).toHaveText("4");
  await expect(page.locator('.summary-card[data-status="sent"] strong')).toHaveText("0");
  await page.getByRole("button", { name: /^Filtrer/u }).click();
  await page.getByRole("combobox", { name: "État", exact: true }).click();
  await page.getByRole("option", { name: "Échec", exact: true }).click();
  await expect(page).toHaveURL(/status=failed/u);
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect(page.getByText("Échec de livraison signalé", { exact: true })).toHaveCount(4);
  await page.getByRole("searchbox", { name: "Rechercher un mail" }).fill("frederic@example.org");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("blocked : due to blacklist user");
  await page.getByRole("button", { name: /^Filtrer/u }).click();
  await page.screenshot({ path: testInfo.outputPath("mail-failure-list.png") });
  await page.getByRole("button", { name: /Détails du mail/u }).click();
  const dialog = page.getByRole("dialog", { name: "Détails du mail", exact: true });
  await expect(dialog.getByText("Livraison bloquée", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Pris en charge par Brevo", { exact: true })).toBeVisible();
  await expect(dialog.getByText("blocked : due to blacklist user", { exact: true })).toBeVisible();
  await expect(dialog.getByText("<delivery-3@smtp-relay.mailin.fr>", { exact: true })).toHaveCount(
    2,
  );
  await page.screenshot({ path: testInfo.outputPath("mail-failure-history.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByText("Livraison bloquée", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath("mail-failure-mobile.png") });
  await expect(await db("auth_user").where({ id: admin.id }).first()).toMatchObject({
    email: "admin@example.org",
    active: true,
  });
  expect(await db("email_notification_outbox").distinct("status")).toEqual([{ status: "sent" }]);
});
