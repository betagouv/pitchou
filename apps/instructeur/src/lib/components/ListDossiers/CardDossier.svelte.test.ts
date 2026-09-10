import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../../app.css";

vi.mock("$lib/shared/aarri.ts", () => ({
  sendDossierSearchEvent: vi.fn(),
  sendEvenement: vi.fn(),
}));

import { store } from "$lib/state/store.svelte.ts";
import CardDossier from "./CardDossier.svelte";
import { makeDossier, makeNotification } from "./testHelpers.ts";

const dossier = makeDossier({
  name: "Restauration des marais",
  source: "demarche_numerique",
  demarche_numerique_number: "987654",
  demandeur_personne_morale_legal_name: "Association des marais",
  demandeur_personne_morale_siret: "12345678900012",
  next_action_expected_from: "Instructeur",
  next_action_expected: "Rédiger une décision",
  enjeu: true,
});

function cardProps(unread = true, follows = false) {
  return {
    dossier,
    notificationViewed: !unread,
    dossierFollowedByCurrentInstructeur: follows,
    currentInstructeurFollowsDossier: vi.fn().mockResolvedValue(undefined),
    currentInstructeurLeavesDossier: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  store.followRelations = new SvelteMap();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  store.followRelations = undefined;
  store.notificationByDossier.clear();
  store.dossierSummaries.clear();
});

test("cards omit references, SIRET and tasks, but keep a clickable non-underlined title", async () => {
  const { container, rerender } = render(CardDossier, cardProps());
  expect(container.textContent).not.toMatch(
    /987654|12345678900012|Rédiger une décision|Dossier n°/,
  );
  expect(screen.getByText("Association des marais").getAttribute("title")).toBe(
    "Association des marais",
  );
  const link = screen.getByRole("link", { name: dossier.name! });
  expect(link.getAttribute("href")).toBe(`/dossier/${dossier.id}`);
  for (const unread of [true, false]) {
    await rerender(cardProps(unread));
    expect(getComputedStyle(link).textDecorationLine).toBe("none");
    expect(getComputedStyle(link).backgroundImage).toBe("none");
    expect(link.classList.contains(unread ? "font-bold" : "font-normal")).toBe(true);
    expect(
      screen
        .getByText("Association des marais")
        .classList.contains(unread ? "font-bold" : "font-normal"),
    ).toBe(true);
    expect(
      screen
        .getByText("Instruction", { exact: true })
        .classList.contains(unread ? "font-bold" : "font-normal"),
    ).toBe(true);
    expect(
      screen
        .getByText("Instructeur", { exact: true })
        .classList.contains(unread ? "font-bold" : "font-normal"),
    ).toBe(true);
    const card = screen.getByTestId("card-dossier");
    expect(getComputedStyle(card).backgroundColor).toBe(
      unread ? "rgb(255, 255, 255)" : "rgb(246, 246, 246)",
    );
    expect(getComputedStyle(card).borderRadius).toBe("4px");
  }
});

test("both stars stay violet-blue and Moi only replaces Instructeur for followed dossiers", async () => {
  const props = cardProps(true, false);
  const { rerender } = render(CardDossier, props);
  expect(getComputedStyle(screen.getByRole("button", { name: /^Suivre$/ })).color).toBe(
    "rgb(106, 106, 244)",
  );
  await fireEvent.click(screen.getByRole("button", { name: /^Suivre$/ }));
  expect(props.currentInstructeurFollowsDossier).toHaveBeenCalledWith(dossier.id);
  expect(screen.getByText("Instructeur", { exact: true })).toBeTruthy();
  await rerender({ ...props, dossierFollowedByCurrentInstructeur: true });
  expect(screen.getByText("Moi", { exact: true })).toBeTruthy();
  expect(getComputedStyle(screen.getByRole("button", { name: /^Ne plus suivre$/ })).color).toBe(
    "rgb(106, 106, 244)",
  );
  await fireEvent.click(screen.getByRole("button", { name: /^Ne plus suivre$/ }));
  expect(props.currentInstructeurLeavesDossier).toHaveBeenCalledWith(dossier.id);
});

test("unassigned can coexist with shared notification badges and never makes a read card unread", async () => {
  const date = new Date();
  store.notificationByDossier.set(
    dossier.id,
    makeNotification({
      viewed: false,
      new_arrival: { detected_at: date },
      new_follow: { revision: "1", detected_at: date },
    }),
  );
  const { rerender } = render(CardDossier, cardProps());
  expect(screen.getByText("Nouveau dossier")).toBeTruthy();
  expect(screen.queryByText("Nouveau suivi")).toBeNull();
  expect(screen.getByText("Sans instructeur-ice")).toBeTruthy();
  expect(screen.getByText("Sans instructeur-ice")).toHaveClass("fr-badge--purple-glycine");
  store.followRelations!.set("colleague@example.org", new SvelteSet([dossier.id]));
  await tick();
  expect(screen.queryByText("Sans instructeur-ice")).toBeNull();
  store.followRelations!.get("colleague@example.org")!.delete(dossier.id);
  store.notificationByDossier.set(dossier.id, makeNotification());
  await rerender(cardProps(false));
  expect(screen.getByText("Sans instructeur-ice")).toBeTruthy();
  expect(screen.getByTestId("card-dossier").classList.contains("unread")).toBe(false);
  expect(screen.queryByText("Nouveau dossier")).toBeNull();
});

test("card menu retains assignment and deadline editing, without sharing or manual unread actions", async () => {
  render(CardDossier, cardProps());
  const trigger = screen.getByRole("button", { name: /Plus d’actions/ });
  for (const element of [trigger, trigger.querySelector("svg")!]) {
    const bounds = element.getBoundingClientRect();
    expect(bounds.width).toBe(24);
    expect(bounds.height).toBe(24);
  }
  await fireEvent.click(trigger);
  expect(screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual([
    "Faire suivre le dossier",
    "Modifier la date de la prochaine échéance",
  ]);
  for (const [index, icon] of ["share-forward-fill", "calendar-event-line"].entries()) {
    const glyph = screen.getAllByRole("menuitem")[index].querySelector(`.fr-icon-${icon}`)!;
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(getComputedStyle(glyph, "::before").maskImage).toMatch(/^url\(/);
    expect(getComputedStyle(glyph, "::before").color).toBe("rgb(0, 0, 145)");
  }
  await fireEvent.click(
    screen.getByRole("menuitem", { name: "Modifier la date de la prochaine échéance" }),
  );
  await expect
    .element(page.getByRole("dialog", { name: "Modifier la date de la prochaine échéance" }))
    .toBeVisible();
});

test("desktop card columns share a vertical center in both read states", async () => {
  await page.viewport(1440, 900);
  const props = {
    ...cardProps(),
    dossier: { ...dossier, phase: "Accompagnement amont" as const },
  };
  const { rerender } = render(CardDossier, props);
  const card = screen.getByTestId("card-dossier");
  card.style.width = "1100px";
  try {
    for (const notificationViewed of [false, true]) {
      await rerender({ ...props, notificationViewed });
      const bounds = card.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      for (const column of card.children) {
        const box = column.getBoundingClientRect();
        expect(Math.abs(box.top + box.height / 2 - center)).toBeLessThan(1);
      }
    }
    card.style.width = "";
    await page.viewport(390, 844);
    expect(getComputedStyle(card).display).toBe("flex");
    expect(getComputedStyle(card).flexDirection).toBe("column");
    expect(getComputedStyle(card).alignItems).not.toBe("center");
  } finally {
    await page.viewport(1280, 720);
  }
});
