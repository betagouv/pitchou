import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import Select from "@pitchou/ui/Select.svelte";

const onWindowKeydown = vi.fn();

beforeEach(() => {
  onWindowKeydown.mockClear();
  window.addEventListener("keydown", onWindowKeydown);
});

afterEach(() => {
  cleanup();
  window.removeEventListener("keydown", onWindowKeydown);
});

test("Escape closes the open select before reaching a modal's window listener", async () => {
  const onChange = vi.fn();
  render(Select, {
    id: "test-select",
    ariaLabel: "Choice",
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    value: "yes",
    onChange,
  });
  const trigger = page.getByRole("combobox", { name: "Choice" });
  await trigger.click();
  await expect.element(page.getByRole("listbox")).toBeVisible();

  await userEvent.keyboard("{Escape}");

  await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
  await expect.element(trigger).toHaveFocus();
  await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
  expect(onWindowKeydown).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();

  await userEvent.keyboard("{Escape}");

  expect(onWindowKeydown).toHaveBeenCalledOnce();
  expect(onWindowKeydown.mock.calls[0][0].defaultPrevented).toBe(false);
});

test("Tab closes the open select without consuming the event", async () => {
  render(Select, {
    id: "test-select",
    ariaLabel: "Choice",
    options: [{ value: "yes", label: "Oui" }],
    value: "yes",
  });
  const trigger = page.getByRole("combobox", { name: "Choice" });
  await trigger.click();

  await userEvent.keyboard("{Tab}");

  await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
  expect(onWindowKeydown).toHaveBeenCalledOnce();
  expect(onWindowKeydown.mock.calls[0][0].defaultPrevented).toBe(false);
});
