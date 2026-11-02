import "@gouvfr/dsfr/dist/dsfr.min.css";
import "../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import GroupPreviewCategory from "./GroupPreviewCategory.svelte";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("800 preview pages wrap all controls within a narrow modal", async () => {
  await page.viewport(320, 844);
  const token = "a".repeat(64);
  const dossiers = [{ id: 1, name: "Projet" }];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify({
            token,
            dossiers,
            count: 20000,
            pageSize: 25,
            page: Number(new URL(url, "http://localhost").searchParams.get("page")),
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ),
  );
  const { container } = render(GroupPreviewCategory, {
    category: "added",
    label: "Dossiers ajoutés",
    result: { count: 20000, dossiers },
    token,
    input: "{}",
    stale: false,
    onStale: vi.fn(),
  });
  // A 320px modal leaves 256px after its outer and inner horizontal padding.
  container.style.width = "256px";
  (container.querySelector("details") as HTMLDetailsElement).open = true;
  await page.getByRole("button", { name: "Page suivante", exact: true }).click();
  await page.getByRole("button", { name: "Page 3", exact: true }).click();
  await page.getByRole("button", { name: "Page 4", exact: true }).click();
  await expect
    .element(page.getByRole("button", { name: "Page 4", exact: true }))
    .toHaveAttribute("aria-current", "page");
  // Interior pages have nine controls and two ellipses, including page 400 of 800.
  const nav = container.querySelector("nav")!;
  expect(nav.querySelectorAll("button")).toHaveLength(9);
  expect(nav.querySelectorAll(".ellipsis")).toHaveLength(2);
  const bounds = nav.getBoundingClientRect();
  for (const button of nav.querySelectorAll("button")) {
    const box = button.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(bounds.left);
    expect(box.right).toBeLessThanOrEqual(bounds.right);
  }
  expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth);
  await page.getByRole("button", { name: "Dernière page", exact: true }).click();
  await expect
    .element(page.getByRole("button", { name: "Page 800", exact: true }))
    .toHaveAttribute("aria-current", "page");
  await expect
    .element(page.getByRole("button", { name: "Page suivante", exact: true }))
    .toBeDisabled();
});
