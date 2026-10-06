import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("admin lists keep search, filtering, sorting and pagination usable on desktop and mobile", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const admin = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  await db("espece_protegee_modification").insert(
    Array.from({ length: 25 }, (_, i) => ({
      cd_ref: String(900000 + i),
      noms_scientifiques: [`Test species ${String(i).padStart(2, "0")}`],
      noms_vernaculaires: [`Espèce ${i}`],
      classification: "Oiseaux",
      excluded: i === 24,
    })),
  );
  await db("evenement_metrique").insert(
    Array.from({ length: 55 }, (_, i) => ({
      personne: admin.id,
      evenement: i === 54 ? "modifierPrescription" : "seConnecter",
      date: new Date(Date.UTC(2026, 0, 1, 12, i)),
      details: { index: i },
    })),
  );
  await loginAs(admin.codeAcces);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(E2E_ADMIN_BASE_URL + "/especes-protegees");
  const species = page.getByRole("region", { name: "Espèces protégées", exact: true });
  await expect(species.getByRole("button", { name: /Test species/ })).toHaveCount(20);
  await page.getByRole("button", { name: "Page suivante", exact: true }).click();
  await expect(species.getByRole("button", { name: /Test species/ })).toHaveCount(5);
  await page.getByRole("searchbox").fill("Test species 24");
  await expect(species.getByRole("button", { name: /Test species/ })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Pagination", exact: true })).toHaveCount(0);
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "Trier", exact: true }).click();
  await page.locator("#sort-panel").getByRole("button", { name: "Nom", exact: true }).click();
  await expect(species.locator("tbody tr").first()).toContainText("Test species 00");
  await page.getByRole("button", { name: "Filtrer", exact: true }).click();
  await page.getByRole("combobox", { name: "État choisi" }).click();
  await page.getByRole("option", { name: "Exclues", exact: true }).click();
  await expect(species.getByRole("button", { name: /Test species/ })).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("species-desktop-dark.png") });

  await page.goto(E2E_ADMIN_BASE_URL + "/evenements");
  const events = page.getByRole("region", { name: "Évènements", exact: true });
  await expect(events.locator("tbody tr")).toHaveCount(50);
  await page.getByRole("button", { name: "Page suivante", exact: true }).click();
  await expect(events.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Trier", exact: true }).click();
  await page.locator("#sort-panel").getByRole("button", { name: "Date", exact: true }).click();
  await expect(page.getByText("Page 1 sur 2", { exact: true })).toBeVisible();
  await expect(events.locator("tbody tr").first()).toContainText('"index":0');
  await page.getByRole("searchbox").fill("nobody@example.org");
  await expect(page.getByText("Aucun évènement ne correspond à cette recherche.")).toBeVisible();
  await page.getByRole("searchbox").fill("admin@example.org");
  await expect(events.locator("tbody tr")).toHaveCount(50);
  await page.screenshot({ path: testInfo.outputPath("events-desktop-dark.png") });

  for (const path of ["dossiers", "aarri", "especes-protegees", "evenements"]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(E2E_ADMIN_BASE_URL + "/" + path);
    const search = page.getByRole("searchbox");
    await expect(search).toBeVisible();
    const filter = page.getByRole("button", { name: "Filtrer", exact: true });
    const sort = page.getByRole("button", { name: "Trier", exact: true });
    const height = await search.locator("..").evaluate((el) => el.getBoundingClientRect().height);
    expect(await filter.evaluate((el) => el.getBoundingClientRect().height)).toBe(height);
    expect(await sort.evaluate((el) => el.getBoundingClientRect().height)).toBe(height);
    await page.setViewportSize({ width: 390, height: 640 });
    await filter.click();
    await expect(page.locator("#filter-panel")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    expect(await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`${path}-mobile-dark.png`) });
  }
});
