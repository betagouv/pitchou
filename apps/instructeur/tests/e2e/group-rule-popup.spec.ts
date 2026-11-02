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
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nom du groupe").fill("Multi-régions");
    await dialog.getByRole("button", { name: "Ajouter une règle", exact: true }).click();
    await dialog.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
    await dialog.getByRole("option", { name: "Département principal", exact: true }).click();
    await dialog.getByRole("button", { name: "Vérifier les affectations", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Une règle doit contenir au moins un critère",
    );
    const trigger = dialog.getByRole("button", { name: "Tous les départements", exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const popup = dialog.getByRole("group", { name: "Départements", exact: true });
    await expect(popup).toBeVisible();
    const triggerBox = (await trigger.boundingBox())!;
    const popupBox = (await popup.boundingBox())!;
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(triggerBox.y);
    expect(popupBox.y).toBeGreaterThanOrEqual(0);
    expect(popupBox.x).toBeGreaterThanOrEqual(0);
    expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`popup-${width}-${colorScheme}.png`) });
    await popup.getByText("99 - Étranger", { exact: true }).click();
    await expect(popup.getByLabel("99 - Étranger", { exact: true })).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "99 - Étranger", exact: true })).toBeFocused();
    await dialog.getByRole("button", { name: "99 - Étranger", exact: true }).click();
    await page.setViewportSize({ width, height: 740 });
    await expect(popup).toBeVisible();
    const resized = (await popup.boundingBox())!;
    expect(resized.y).toBeGreaterThanOrEqual(0);
    expect(resized.y + resized.height).toBeLessThanOrEqual(740);
    await dialog.getByRole("heading", { name: "Nouveau groupe", exact: true }).click();
    await expect(popup).toHaveCount(0);
  });
}
