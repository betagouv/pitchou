import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../../app.css";
import CardDossier from "./CardDossier.svelte";
import { makeDossier } from "./testHelpers.ts";

vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));
afterEach(cleanup);

const dossier = makeDossier({
  name: "Restauration des marais",
  demandeur_personne_morale_legal_name: "Association des marais",
  next_action_expected_from: "Instructeur",
});

test.each(["light", "dark"])(
  "%s cards keep readable DSFR colors in both read states",
  async (theme) => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute("data-fr-theme");
    try {
      root.setAttribute("data-fr-theme", theme);
      const { rerender } = render(CardDossier, {
        dossier,
        notificationViewed: false,
        dossierFollowedByCurrentInstructeur: false,
        currentInstructeurFollowsDossier: vi.fn().mockResolvedValue(undefined),
        currentInstructeurLeavesDossier: vi.fn().mockResolvedValue(undefined),
      });
      const dark = theme === "dark";
      for (const unread of [true, false]) {
        await rerender({ notificationViewed: !unread });
        expect(getComputedStyle(screen.getByTestId("card-dossier")).backgroundColor).toBe(
          dark
            ? unread
              ? "rgb(22, 22, 22)"
              : "rgb(30, 30, 30)"
            : unread
              ? "rgb(255, 255, 255)"
              : "rgb(246, 246, 246)",
        );
        const title = screen.getByRole("link", { name: dossier.name! });
        expect(getComputedStyle(title).color).toBe(dark ? "rgb(255, 255, 255)" : "rgb(22, 22, 22)");
        for (const text of ["Association des marais", "Instructeur"]) {
          expect(getComputedStyle(screen.getByText(text, { exact: true })).color).toBe(
            dark ? "rgb(206, 206, 206)" : "rgb(58, 58, 58)",
          );
        }
        expect(
          getComputedStyle(screen.getByText("Localisation", { exact: false }).parentElement!).color,
        ).toBe(dark ? "rgb(146, 146, 146)" : "rgb(102, 102, 102)");
      }
    } finally {
      if (previousTheme === null) root.removeAttribute("data-fr-theme");
      else root.setAttribute("data-fr-theme", previousTheme);
    }
  },
);
