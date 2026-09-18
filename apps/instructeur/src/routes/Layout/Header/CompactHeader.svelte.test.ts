import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import { page, userEvent } from "vitest/browser";
import CompactHeader from "./CompactHeader.svelte";

vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));

afterEach(async () => {
  cleanup();
  document.documentElement.removeAttribute("data-fr-theme");
  await page.viewport(1280, 720);
});

test.each([320, 390, 1024, 1440])(
  "the shared Pitchou logo loads without distortion at %ipx",
  async (width) => {
    await page.viewport(width, 900);
    render(CompactHeader, { email: "instructeur@example.com", onLogout: vi.fn() });
    const image = screen.getByRole("img", {
      name: "Pitchou",
    }) as HTMLImageElement;
    await image.decode();
    expect(image.naturalWidth).toBe(209);
    expect(image.naturalHeight).toBe(40);
    const bounds = image.getBoundingClientRect();
    expect(bounds.width).toBe(209);
    expect(bounds.height).toBe(40);
    const header = image.closest("header")!.getBoundingClientRect();
    if (width >= 1024) {
      expect(header.height).toBe(80);
      expect(
        Math.abs(bounds.top + bounds.height / 2 - header.top - header.height / 2),
      ).toBeLessThan(1);
    } else {
      expect(header.height).toBeGreaterThanOrEqual(80);
    }
    expect(image.closest("a")).toHaveAttribute("href", "/");
    expect(image.closest("a")).toHaveAttribute("title", "Accueil - Pitchou");
    expect(getComputedStyle(image.closest("a")!).backgroundImage).toBe("none");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    const source = await fetch(image.src);
    expect(source.ok).toBe(true);
    const svg = new DOMParser().parseFromString(await source.text(), "image/svg+xml");
    expect(svg.querySelector("parsererror")).toBeNull();
    expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 209 40");
    expect(svg.querySelectorAll("linearGradient")).toHaveLength(2);
  },
);

test("dark mode swaps in the dark logo and account actions still work", async () => {
  document.documentElement.dataset.frTheme = "dark";
  const onLogout = vi.fn();
  const { container } = render(CompactHeader, { email: "instructeur@example.com", onLogout });
  // Only the dark variant is shown; the light one is display:none, so out of the
  // accessibility tree.
  const image = screen.getByRole("img", { name: "Pitchou" }) as HTMLImageElement;
  const images = container.querySelectorAll("img");
  expect(images).toHaveLength(2);
  expect(image).toBe(images[1]);
  expect(getComputedStyle(images[0]).display).toBe("none");
  expect(getComputedStyle(image).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  await image.decode();
  expect(image.naturalWidth).toBe(209);
  expect(image.naturalHeight).toBe(40);
  const bounds = image.getBoundingClientRect();
  expect([bounds.width, bounds.height]).toEqual([209, 40]);
  const source = await fetch(image.src);
  expect(source.ok).toBe(true);
  const svg = new DOMParser().parseFromString(await source.text(), "image/svg+xml");
  expect(svg.querySelector("parsererror")).toBeNull();
  expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 419 80");
  // The light wordmark is #252E7E; the dark one uses the lighter #9198DE.
  expect(svg.querySelectorAll('path[fill="#9198DE"]').length).toBeGreaterThan(0);
  expect(svg.querySelector('path[fill="#252E7E"]')).toBeNull();

  await userEvent.click(screen.getByRole("button", { name: "Mon espace" }));
  await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
  expect(onLogout).toHaveBeenCalledOnce();

  // Switching back to light restores the light logo without a re-render.
  document.documentElement.dataset.frTheme = "light";
  expect(getComputedStyle(images[0]).display).toBe("block");
  expect(getComputedStyle(images[1]).display).toBe("none");
});
