import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../../../app.css";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
import { dossier, setupDsfrModalMock } from "./ouvrirModaleAjouterPieceJointe.testHelpers.ts";

vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));

beforeEach(setupDsfrModalMock);

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-fr-theme");
});

test.each(["light", "dark"])(
  "the DSFR modal stands out from the page in %s mode like the custom dialogs",
  (theme) => {
    document.documentElement.dataset.frTheme = theme;
    const { container } = render(ModalAddPieceJointe, {
      id: "modale-test",
      dossier: dossier(),
      source: "enteteDossier",
    });
    const modal = container.querySelector<HTMLElement>("dialog.fr-modal")!;
    const body = modal.querySelector<HTMLElement>(".fr-modal__body")!;
    expect(getComputedStyle(modal).backgroundColor).toBe("rgba(0, 0, 0, 0.64)");
    expect(getComputedStyle(body).backgroundColor).toBe(
      theme === "dark" ? "rgb(30, 30, 30)" : "rgb(255, 255, 255)",
    );
    expect(getComputedStyle(body).borderTopWidth).toBe(theme === "dark" ? "1px" : "0px");
    if (theme === "dark") expect(getComputedStyle(body).borderTopColor).toBe("rgb(53, 53, 53)");
  },
);
