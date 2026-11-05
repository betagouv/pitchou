import { expect, type Locator, type Page } from "@playwright/test";

export async function saveAccessForm(page: Page, form: Locator, endpoint: string) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith(endpoint) && response.request().method() === "POST",
  );
  await form.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(form).toHaveCount(0);
}
