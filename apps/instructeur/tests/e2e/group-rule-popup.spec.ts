import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

for (const { width, colorScheme } of [
  { width: 1280, colorScheme: "dark" as const },
  { width: 1280, colorScheme: "light" as const },
  { width: 390, colorScheme: "dark" as const },
]) {
  test(`group criteria popovers escape footer clipping at ${width}px in ${colorScheme} mode`, async ({
    page,
    db,
    loginAs,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme });
    const actor = await createInstructeurWithCapToGroup(db);
    await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
    await loginAs(actor.codeAcces);
    await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
    await page.getByRole("button", { name: "Créer un groupe", exact: true }).click();
    const editor = page.getByRole("region", { name: "Modifier le groupe", exact: true });
    await editor.getByLabel("Nom du groupe").fill("Multi-régions");
    await page.getByRole("tab", { name: /Règles/u }).click();
    await editor.getByRole("button", { name: "Ajouter une règle", exact: true }).click();
    await editor.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
    await editor.getByRole("option", { name: "Département principal", exact: true }).click();
    await editor
      .getByRole("button", { name: "Sélectionner des départements", exact: true })
      .click();
    await editor.getByRole("button", { name: "Tout", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.route("**/api/groupes-instructeurs/apercu", (route) =>
      route.fulfill({ status: 503, json: { message: "Aperçu indisponible. Réessayez." } }),
    );
    await editor.getByRole("button", { name: "Vérifier les affectations", exact: true }).click();
    await expect(editor.getByRole("alert")).toContainText("Aperçu indisponible. Réessayez.");
    const trigger = editor.getByRole("button", { name: "Tous les départements", exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const popup = editor.getByRole("group", { name: "Départements", exact: true });
    await expect(popup).toBeVisible();
    const triggerBox = (await trigger.boundingBox())!;
    const popupBox = (await popup.boundingBox())!;
    expect(
      popupBox.y + popupBox.height <= triggerBox.y ||
        popupBox.y >= triggerBox.y + triggerBox.height,
    ).toBe(true);
    expect(popupBox.y).toBeGreaterThanOrEqual(0);
    expect(popupBox.x).toBeGreaterThanOrEqual(0);
    expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`popup-${width}-${colorScheme}.png`) });
    await popup.getByRole("button", { name: "Aucun", exact: true }).click();
    await popup.getByText("99 - Étranger", { exact: true }).click();
    await expect(popup.getByLabel("99 - Étranger", { exact: true })).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("button", { name: "99 - Étranger", exact: true })).toBeFocused();
    await editor.getByRole("button", { name: "99 - Étranger", exact: true }).click();
    await page.setViewportSize({ width, height: 740 });
    await expect(popup).toBeVisible();
    const resized = (await popup.boundingBox())!;
    expect(resized.y).toBeGreaterThanOrEqual(0);
    expect(resized.y + resized.height).toBeLessThanOrEqual(740);
    await page.getByRole("banner").click({ position: { x: 2, y: 2 } });
    await expect(popup).toHaveCount(0);
  });
}
