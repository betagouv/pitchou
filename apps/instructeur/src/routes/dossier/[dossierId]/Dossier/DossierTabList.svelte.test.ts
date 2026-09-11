import "@gouvfr/dsfr/dist/dsfr.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import { page } from "vitest/browser";
import DossierTabList from "./DossierTabList.svelte";

afterEach(async () => {
  cleanup();
  await page.viewport(1280, 720);
});

test("tabs override DSFR's stripe and blue inactive background with medium-weight neutral tabs", () => {
  const onSelect = vi.fn();
  render(DossierTabList, { activeTab: "instruction", onSelect });
  const tabs = screen.getAllByRole("tab");
  expect(tabs[0]).toHaveTextContent("Instruction");
  expect(tabs[1]).toHaveTextContent(/^Détail du projet$/);
  expect(tabs[2]).toHaveTextContent(/^Avis d’experts$/);
  const active = getComputedStyle(tabs[0]);
  const inactive = getComputedStyle(tabs[1]);
  expect(active.fontWeight).toBe("500");
  expect(active.fontSize).toBe("14px");
  expect(active.backgroundImage).toBe("none");
  expect(active.boxShadow).toBe("none");
  expect(active.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(active.borderRadius).toBe("4px 4px 0px 0px");
  expect(inactive.backgroundColor).toBe("rgb(238, 238, 238)");
  expect(inactive.fontWeight).toBe("500");
  tabs[1].click();
  expect(onSelect).toHaveBeenCalledWith("detail-du-projet");
});

test.each([390, 1024, 1440])(
  "visible tab buttons have an actual 8px gap at %ipx",
  async (width) => {
    await page.viewport(width, 900);
    render(DossierTabList, {
      activeTab: "instruction",
      onSelect: vi.fn(),
      hasPendingChanges: true,
    });
    const tabs = screen.getAllByRole("tab");
    for (let i = 0; i < tabs.length; i++) {
      expect(getComputedStyle(tabs[i]).marginLeft).toBe("0px");
      expect(getComputedStyle(tabs[i]).marginRight).toBe("0px");
      expect(getComputedStyle(tabs[i]).fontSize).toBe("14px");
      if (i > 0)
        expect(
          tabs[i].getBoundingClientRect().left - tabs[i - 1].getBoundingClientRect().right,
        ).toBeCloseTo(8, 1);
    }
    const project = screen.getByRole("tab", { name: "Détail du projet" });
    expect(project).toHaveAccessibleDescription("Modifications non lues");
    const dot = project.querySelector<HTMLElement>(".pending-dot")!;
    expect(dot.getBoundingClientRect().width).toBe(10);
    expect(dot.getBoundingClientRect().top - project.getBoundingClientRect().top).toBe(8);
    expect(getComputedStyle(dot).backgroundColor).toBe("rgb(239, 203, 58)");
  },
);
