import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

for (const width of [1600, 320]) {
  test(`admin page tabs remain below the header while scrolling at ${width}px`, async ({
    page,
    db,
    loginAs,
  }, testInfo) => {
    const actor = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
    await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
    await db("groupe_instructeurs").insert(
      Array.from({ length: 15 }, (_, i) => ({ name: `Service ${i + 1}` })),
    );
    await db("auth_user").insert(
      Array.from({ length: 15 }, (_, i) => ({ email: `member${i + 1}@example.org` })),
    );
    const dossier = await createDossier(db, { source: "pitchou", demarche_number: null });
    await loginAs(actor.codeAcces);
    await page.setViewportSize({ width, height: 600 });
    await page.emulateMedia({ colorScheme: "dark" });

    for (const [path, tab] of [
      [`utilisateurs/${actor.id}`, /^Groupes/u],
      [`groupes-instructeurs/${actor.groupeId}`, /^Membres/u],
      [`dossiers/${dossier.id}`, /^Dossier$/u],
    ] as const) {
      await page.goto(`${E2E_ADMIN_BASE_URL}/${path}`);
      await page.getByRole("tab", { name: tab }).click();
      const tabs = page.getByRole("tablist");
      const main = page.locator("main");
      await main.evaluate((element) => {
        element.parentElement!.scrollTop = 200;
      });
      await expect
        .poll(() => main.evaluate((element) => element.parentElement!.scrollTop))
        .toBeGreaterThan(100);
      await expect
        .poll(async () => {
          const header = (await page.locator("header.sticky").boundingBox())!;
          const bar = (await tabs.boundingBox())!;
          return Math.abs(bar.y - header.y - header.height);
        })
        .toBeLessThanOrEqual(1);
      await expect(tabs).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await page.screenshot({
        path: testInfo.outputPath(`${path.split("/")[0]}-sticky-${width}.png`),
      });
      await page.getByRole("tab").first().click();
      await expect(page.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
    }
  });
}
