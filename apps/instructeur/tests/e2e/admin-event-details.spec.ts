import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("events open full details with keyboard access and a visible mobile footer", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const admin = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  const details = {
    message: "Détail très long ".repeat(100),
    nested: { count: 0, active: false },
    text: "<script>not executable</script>",
    last: "Fin des détails",
  };
  const [event] = await db("evenement_metrique")
    .insert([
      {
        personne: admin.id,
        evenement: "modifierPrescription",
        date: new Date("2026-10-02T09:35:00Z"),
        details,
      },
      {
        personne: admin.id,
        evenement: "seConnecter",
        date: new Date("2026-01-01T00:00:00Z"),
        details: null,
      },
    ])
    .returning("*");
  await loginAs(admin.codeAcces);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(E2E_ADMIN_BASE_URL + "/evenements");
  const row = page.getByRole("button", { name: /^Voir modifierPrescription/ });
  await expect(row).toBeVisible();
  const date = row.locator("td").first();
  expect(
    await date.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getClientRects().length;
    }),
  ).toBe(1);
  await row.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Détails de l'évènement" });
  await expect(dialog).toContainText(event.id);
  await expect(dialog).toContainText("admin@example.org");
  await expect(dialog.locator("pre")).toBeVisible();
  expect(JSON.parse((await dialog.locator("pre").textContent())!)).toEqual(details);
  await expect(dialog.locator("script")).toHaveCount(0);
  await expect(dialog.locator("header button")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator("footer button")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("header button")).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("event-details-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(row).toBeFocused();
  await page.keyboard.press("Space");
  await expect(dialog).toBeVisible();
  await dialog.locator("footer button").click();
  await page.setViewportSize({ width: 390, height: 640 });
  await row.click();
  await expect(dialog.locator("footer button")).toBeInViewport();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.locator("pre").evaluate((el) => {
    el.parentElement!.parentElement!.scrollTop = 100000;
  });
  await expect(dialog.locator("footer button")).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("event-details-mobile.png") });
  await dialog.locator("footer button").click();
  const legacy = page.getByRole("button", { name: /^Voir seConnecter/ });
  await expect(legacy.locator("td").first()).not.toContainText(":");
  await legacy.click();
  await expect(dialog).toContainText("Aucun détail supplémentaire pour cet évènement.");
});
