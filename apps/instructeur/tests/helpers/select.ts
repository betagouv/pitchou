import { expect, type Locator } from "@playwright/test";

/**
 * Picks an option in a `Select` — the custom listbox that replaced native
 * `<select>` elements, so `selectOption()` has nothing to act on: the trigger
 * has to be opened, then the option clicked by its visible label.
 */
export async function chooseInSelect(trigger: Locator, optionLabel: string): Promise<void> {
  await trigger.click();

  const listbox = trigger.page().getByRole("listbox");
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: optionLabel, exact: true }).click();
  await expect(listbox).toBeHidden();
}
