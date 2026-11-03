import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import CardDossier from "./CardDossier.svelte";
import { makeDossier } from "./testHelpers.ts";

afterEach(cleanup);

test.each([
  { access: "lecture" as const, readOnly: false },
  { access: "lecture_complete" as const, readOnly: false },
  { access: "complet" as const, readOnly: true },
])(
  "$access access with readOnly=$readOnly allows personal following without dossier mutation controls",
  ({ access, readOnly }) => {
    const dossier = makeDossier({ access });
    render(CardDossier, {
      dossier,
      readOnly,
      notificationViewed: false,
      dossierFollowedByCurrentInstructeur: false,
      currentInstructeurFollowsDossier: vi.fn(),
      currentInstructeurLeavesDossier: vi.fn(),
    });

    expect(screen.getByRole("link", { name: dossier.name! })).toHaveAttribute(
      "href",
      `/dossier/${dossier.id}${access === "lecture_complete" ? "" : "?lecture=1"}`,
    );
    expect(screen.getByRole("button", { name: /^Suivre$/u })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Plus d’actions/u })).toBeNull();
    expect(screen.queryByText("Sans instructeur-ice")).toBeNull();
    expect(screen.getByTestId("card-dossier").classList.contains("unread")).toBe(!readOnly);
  },
);
