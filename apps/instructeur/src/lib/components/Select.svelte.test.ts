import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../app.css";
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

test.each(["choice.with.dots", "choice:with:colons", "123choice"])(
  "scrolls the active option when the select ID is %s",
  async (id) => {
    const scrolledIds: string[] = [];
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (
      this: Element,
    ) {
      scrolledIds.push(this.id);
    });
    try {
      render(Select, {
        id,
        ariaLabel: "Choice",
        options: [
          { value: "yes", label: "Oui" },
          { value: "no", label: "Non" },
        ],
        value: "yes",
      });
      await page.getByRole("combobox", { name: "Choice" }).click();
      await userEvent.keyboard("{ArrowDown}");
      await vi.waitFor(() => expect(scrolledIds).toContain(`${id}-option-1`));
    } finally {
      scroll.mockRestore();
    }
  },
);

test("the list stays under its trigger inside a container that traps fixed positioning", async () => {
  // A DSFR modal body has a `filter`, which turns it into the containing block of
  // `position: fixed` descendants: viewport coordinates then land in the wrong place.
  const container = document.createElement("div");
  container.style.cssText =
    "filter: drop-shadow(0 0 1px black); margin: 120px 80px; padding: 24px;";
  document.body.append(container);
  try {
    render(Select, {
      target: container,
      props: {
        id: "test-select",
        ariaLabel: "Choice",
        options: [
          { value: "yes", label: "Oui" },
          { value: "no", label: "Non" },
        ],
        value: "yes",
      },
    });
    const trigger = page.getByRole("combobox", { name: "Choice" });
    await trigger.click();
    const listbox = page.getByRole("listbox");
    await expect.element(listbox).toBeVisible();
    const triggerBox = trigger.element().getBoundingClientRect();
    const listBox = listbox.element().getBoundingClientRect();
    expect(triggerBox.left).toBeGreaterThan(100);
    expect([listBox.left, listBox.width, listBox.top - triggerBox.bottom].map(Math.round)).toEqual(
      [triggerBox.left, triggerBox.width, 4].map(Math.round),
    );
  } finally {
    container.remove();
  }
});

test("a narrow dropdown wraps long text and scrolls vertically within the viewport", async () => {
  const { innerWidth, innerHeight } = window;
  await page.viewport(360, 800);
  try {
    const onChange = vi.fn();
    const { container } = render(Select, {
      id: "narrow-select",
      ariaLabel: "Choice",
      options: [
        {
          label: "Regroupement".repeat(8),
          options: [
            { value: "long", label: "Identifiant".repeat(12), hint: "Description".repeat(12) },
            ...Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: `Option ${i}` })),
          ],
        },
      ],
      value: "long",
      onChange,
    });
    container.style.cssText = "width: 120px; margin-inline-start: auto;";

    await page.getByRole("combobox", { name: "Choice" }).click();
    const list = page.getByRole("listbox").element();
    expect(list.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(list.scrollWidth).toBe(list.clientWidth);
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    list.scrollTop = list.scrollHeight;
    expect(list.scrollTop).toBeGreaterThan(0);

    await page.getByRole("option", { name: "Option 11", exact: true }).click();
    expect(onChange).toHaveBeenCalledWith("11");
  } finally {
    await page.viewport(innerWidth, innerHeight);
  }
});
