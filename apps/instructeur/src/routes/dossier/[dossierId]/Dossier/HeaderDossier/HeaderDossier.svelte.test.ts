import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import HeaderDossier from "../HeaderDossier.svelte";
import { fakeDossierFull } from "../../../../fakeDossier.ts";

vi.mock(import("$lib/shared/aarri.ts"), async (importOriginal) => ({
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
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(props().dossier.name!.trim());
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
  expect(screen.queryByRole("button", { name: /Marquer le dossier/ })).toBeNull();
});
