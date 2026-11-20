import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import HeaderDossier from "../HeaderDossier.svelte";
import { fetchVersionData } from "../DossierVersions/api.ts";
import { fakeDossierFull } from "../../../../fakeDossier.ts";

vi.mock(import("../DossierVersions/api.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchVersionData: vi.fn().mockResolvedValue({
    projet: null,
    access: "complet",
    demandes: [{ id: 123, label: "Demande initiale", phase: "Instruction" }],
  }),
}));

vi.mock(import("#lib/shared/aarri.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  sendEvenement: vi.fn(),
}));

let intersection: IntersectionObserverCallback;
const disconnect = vi.fn();

beforeEach(() => {
  disconnect.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal("scrollY", 0);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function props() {
  return {
    dossier: fakeDossierFull({
      name: "Un dossier avec un titre très long ".repeat(8),
      enjeu: true,
    }),
    email: "instructeur@example.com",
    currentDossierFollowedByCurrentInstructeur: false,
    dossierFollowers: [],
    updated: false,
    onClose: vi.fn(),
    onEnterReadOnly: vi.fn(),
  };
}

function setIntersection(visible: boolean, bottom: number) {
  intersection(
    [{ isIntersecting: visible, boundingClientRect: { bottom } } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}

async function scroll(y: number) {
  vi.stubGlobal("scrollY", y);
  window.dispatchEvent(new Event("scroll"));
  await new Promise(requestAnimationFrame);
  await tick();
}

test("the compact header appears as soon as the original leaves the viewport, even before 340px", async () => {
  const { rerender, unmount } = render(HeaderDossier, props());
  expect(screen.getByRole("heading", { level: 2 })).toMatchTextContent(
    props().dossier.name!.trim(),
  );
  expect(screen.getByText("Sans instructeur-ice")).toBeTruthy();
  expect(screen.queryByTestId("sticky-dossier-header")).toBeNull();
  setIntersection(true, 100);
  await scroll(500);
  expect(screen.queryByTestId("sticky-dossier-header")).toBeNull();
  setIntersection(false, 1000);
  await tick();
  expect(screen.queryByTestId("sticky-dossier-header")).toBeNull();
  await scroll(300);
  setIntersection(false, -1);
  await waitFor(() => expect(screen.getByTestId("sticky-dossier-header")).toBeTruthy());
  await rerender({ ...props(), updated: true });
  expect(screen.getAllByText("Dossier mis à jour")).toHaveLength(2);
  await rerender({ ...props(), updated: false });
  expect(screen.queryByText("Dossier mis à jour")).toBeNull();
  setIntersection(true, 100);
  await tick();
  expect(screen.queryByTestId("sticky-dossier-header")).toBeNull();
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

test("both follow states keep the outlined medium button and the untruncated local email label", async () => {
  const { rerender } = render(HeaderDossier, {
    ...props(),
    dossierFollowers: ["a.long.instructeur.name@example.com"],
  });
  expect(screen.queryByText("Sans instructeur-ice")).toBeNull();
  expect(screen.getByRole("button", { name: "Suivi par a.long.instructeur.name" })).not.toHaveClass(
    "truncate",
  );
  const follow = screen.getByRole("button", { name: "Suivre ce dossier" });
  expect(follow).toHaveClass("fr-btn--secondary");
  expect(getComputedStyle(follow).minHeight).toBe("40px");
  expect(getComputedStyle(follow).borderRadius).toBe("4px");
  expect(getComputedStyle(follow).boxShadow).toContain(getComputedStyle(follow, "::before").color);
  expect(getComputedStyle(follow, "::before").color).toBe("rgb(106, 106, 244)");
  await rerender({ ...props(), currentDossierFollowedByCurrentInstructeur: true });
  expect(screen.getByRole("button", { name: "Vous suivez ce dossier" })).toHaveClass(
    "fr-btn--secondary",
  );
  const unfollow = screen.getByRole("button", { name: "Vous suivez ce dossier" });
  expect(getComputedStyle(unfollow).boxShadow).toContain(
    getComputedStyle(unfollow, "::before").color,
  );
  expect(screen.queryByRole("button", { name: /Marquer le dossier/u })).toBeNull();
});

test("only dossiers with multiple demandes show a selector, and the actions menu omits demande changes", async () => {
  const headerProps = props();
  const singletonId = 125 as DossierId;
  vi.mocked(fetchVersionData)
    .mockResolvedValueOnce({
      projet: { id: "project", name: headerProps.dossier.name },
      access: "complet",
      demandes: [
        { id: headerProps.dossier.id, label: "Demande initiale", phase: "Instruction" },
        { id: 124, label: "Seconde demande", phase: "Instruction" },
      ],
    })
    .mockResolvedValueOnce({
      projet: { id: "singleton", name: "Projet avec une demande" },
      access: "complet",
      demandes: [{ id: singletonId, label: "Demande unique", phase: "Instruction" }],
    });
  const { rerender } = render(HeaderDossier, headerProps);
  await fireEvent.click(await screen.findByRole("button", { name: /Changer de demande/u }));
  expect(screen.getAllByRole("menuitemradio")).toHaveLength(2);

  await fireEvent.click(screen.getByRole("button", { name: /Plus d’actions/u }));
  expect(screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual([
    "Faire suivre le dossier",
    "Ajouter une pièce jointe",
    "Voir le dossier en lecture seule",
  ]);

  await rerender({ ...headerProps, dossier: fakeDossierFull({ id: singletonId }) });
  await waitFor(() =>
    expect(fetchVersionData).toHaveBeenCalledWith("/dossier/125/demandes", expect.any(AbortSignal)),
  );
  await tick();
  expect(screen.queryByRole("button", { name: /Changer de demande/u })).toBeNull();
});
