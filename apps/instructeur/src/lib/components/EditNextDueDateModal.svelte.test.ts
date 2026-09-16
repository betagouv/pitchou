import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import EditNextDueDateModal from "./EditNextDueDateModal.svelte";
import { dossierId } from "./ListDossiers/testHelpers.ts";

vi.mock("$lib/dossier/dossier.ts", () => ({ updateDossierNextDueDate: vi.fn() }));

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-fr-theme");
});

function channels(color: string) {
  const [r, g, b, a = "1"] = color.match(/[\d.]+/g)!;
  return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
}

test.each(["light", "dark"])(
  "the %s modal stands out from the page behind its veil",
  async (theme) => {
    document.documentElement.dataset.frTheme = theme;
    render(EditNextDueDateModal, {
      dossierId: dossierId(1),
      dossierName: "Projet",
      onClose: vi.fn(),
    });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    const surface = channels(getComputedStyle(dialog).backgroundColor);
    expect(surface).toEqual(
      theme === "dark" ? { r: 30, g: 30, b: 30, a: 1 } : { r: 255, g: 255, b: 255, a: 1 },
    );
    const veil = channels(getComputedStyle(dialog, "::backdrop").backgroundColor);
    expect(veil).toEqual({ r: 0, g: 0, b: 0, a: 0.64 });
    // Dark greys stay close even under the veil, so dark mode also draws the edge.
    expect(getComputedStyle(dialog).borderTopWidth).toBe(theme === "dark" ? "1px" : "0px");
    if (theme === "dark") {
      expect(getComputedStyle(dialog).borderTopColor).toBe("rgb(53, 53, 53)");
    }
    // What the page looks like once the veil covers it, against the modal surface.
    const pageBackground = channels(getComputedStyle(document.body).backgroundColor);
    const veiled = pageBackground.r * (1 - veil.a) + veil.r * veil.a;
    expect(Math.abs(surface.r - veiled)).toBeGreaterThanOrEqual(18);
  },
);
