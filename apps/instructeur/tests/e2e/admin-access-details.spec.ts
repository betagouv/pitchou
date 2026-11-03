import { changeAssignments } from "@pitchou/server/dossierRouting.ts";
import {
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { expect, test } from "../fixtures/playwright.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

for (const width of [1280, 320]) {
  test(`access picker keeps search fixed and explains manual precedence at ${width}px`, async ({
    page,
    db,
    loginAs,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    const actor = await createInstructeurWithCapToGroup(db);
    await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
    const dossier = await createDossier(db, {
      name: "Projet de démonstration",
      primary_department: "22",
    });
    const group = await createGroupeInstructeurs(db, { name: "Service régional Bretagne" });
    await changeAssignments(
      db,
      (routingTrx) =>
        routingTrx("groupe_departement").insert({
          groupe_instructeurs: group.id,
          department: "22",
        }),
      { silent: true },
    );
    await changeAssignments(db, (routingTrx) =>
      routingTrx("dossier_group_override").insert({
        dossier: dossier.id,
        groupe_instructeurs: group.id,
        mode: "include",
        access_level: "read",
      }),
    );
    await db("groupe_instructeurs").insert(
      Array.from({ length: 60 }, (_, index) => ({
        name: `Service complémentaire ${String(index + 1).padStart(2, "0")}`,
      })),
    );
    await loginAs(actor.codeAcces);
    await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
    await page.getByRole("tab", { name: "Accès au dossier", exact: true }).click();
    const groups = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
    const row = groups.getByRole("article", { name: group.name });
    const details = row.locator("details");
    const summary = details.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details).toContainText(
      "Ce choix remplace le niveau prévu par les règles ci-dessous.",
    );
    await expect(details.locator("dt")).toHaveText(["Département principal"]);
    await expect(details.locator("dd")).toHaveText(["22 · Côtes-d'Armor"]);
    await expect(details.getByText("Instruction", { exact: true })).toBeVisible();
    await expect(row.getByText("Lecture complète", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`assignment-details-${width}.png`) });

    await groups.getByRole("button", { name: "Ajouter un groupe", exact: true }).click();
    await groups.getByRole("combobox", { name: /^Groupe instructeur/u }).click();
    const popup = page.getByRole("group", { name: "Rechercher une option", exact: true });
    const search = popup.getByRole("searchbox");
    const list = popup.getByRole("listbox");
    await expect(search).toBeFocused();
    const initialSearch = await search.boundingBox();
    const geometry = await popup.evaluate((element) => {
      const results = element.querySelector('[role="listbox"]')!;
      return {
        outerHeight: element.clientHeight,
        outerContent: element.scrollHeight,
        innerHeight: results.clientHeight,
        innerContent: results.scrollHeight,
        overflow: getComputedStyle(element).overflowY,
      };
    });
    expect(geometry.overflow).toBe("hidden");
    expect(geometry.outerContent).toBeLessThanOrEqual(geometry.outerHeight + 1);
    expect(geometry.innerContent).toBeGreaterThan(geometry.innerHeight);
    await list.hover();
    await page.mouse.wheel(0, 700);
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect((await search.boundingBox())?.y).toBe(initialSearch?.y);
    expect(await popup.evaluate((element) => element.scrollTop)).toBe(0);
    await search.focus();
    for (let index = 0; index < 35; index++) await page.keyboard.press("ArrowDown");
    expect((await search.boundingBox())?.y).toBe(initialSearch?.y);
    await expect(search).toBeFocused();
    const activeId = await search.getAttribute("aria-activedescendant");
    await expect(page.locator(`[id="${activeId}"]`)).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`fixed-search-${width}.png`) });
    await search.fill("complémentaire 60");
    await expect(list.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(popup).toHaveCount(0);
    await expect(groups.getByRole("combobox")).toContainText("Service complémentaire 60");
    expect(await db("dossier_group_override").where({ dossier: dossier.id })).toHaveLength(1);
  });
}
