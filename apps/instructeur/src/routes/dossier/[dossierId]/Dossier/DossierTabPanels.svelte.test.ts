import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import Dossier from "../Dossier.svelte";
import { fakeDossierFull } from "../../../fakeDossier.ts";
import type { DossierTab } from "./dossierTabs.ts";

vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_PITCHOU_ENV: "" } }));
vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));
vi.mock("$lib/especes/activitesMethodesMoyensDePoursuite.ts", () => ({
  loadActivitesMethodesMoyensDePoursuite: vi.fn(() => new Promise(() => {})),
  loadEspecesProtegeesList: vi.fn(() => new Promise(() => {})),
}));

afterEach(cleanup);

test("switching dossier tabs hides the previous panel immediately and preserves its form", async () => {
  const props = {
    dossier: fakeDossierFull(),
    activeTab: "instruction" as DossierTab,
    onTabChange: vi.fn(),
    email: "instructeur@example.com",
    dossierFollowers: [],
    currentDossierFollowedByCurrentInstructeur: false,
    readOnly: false,
    onReadOnlyChange: vi.fn(),
    canEdit: true,
    onClose: vi.fn(),
  };
  const { container, rerender } = render(Dossier, props);
  const instruction = container.querySelector<HTMLElement>("#tabpanel-instruction-panel")!;
  instruction.focus();
  expect(document.activeElement).toBe(instruction);
  expect(getComputedStyle(instruction).outlineOffset).toBe("2px");
  expect(getComputedStyle(instruction).outlineStyle).not.toBe("none");
  const form = instruction.querySelector("input")!;
  form.value = "Unchanged draft";
  const panels = [...container.querySelectorAll<HTMLElement>('[role="tabpanel"]')];

  for (const activeTab of ["detail-du-projet", "instruction", "avis", "instruction"] as const) {
    await rerender({ ...props, activeTab });
    for (const panel of panels) {
      const selected = panel.id === `tabpanel-${activeTab}-panel`;
      expect(getComputedStyle(panel).transitionDuration).toBe("0s");
      expect(getComputedStyle(panel).transform).toBe("none");
      expect(getComputedStyle(panel).visibility).toBe(selected ? "visible" : "hidden");
    }
    await new Promise(requestAnimationFrame);
    expect(panels.filter((panel) => getComputedStyle(panel).visibility === "visible")).toHaveLength(
      1,
    );
  }
  expect(instruction.querySelector("input")).toBe(form);
  expect(form.value).toBe("Unchanged draft");
});
