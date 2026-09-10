import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, within } from "@testing-library/svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../../app.css";
import { store } from "$lib/state/store.svelte.ts";
import DossiersResults from "./DossiersResults.svelte";
import DossierNotificationBadges from "../DossierNotificationBadges.svelte";
import { dossierId, makeDossier, makeNotification } from "./testHelpers.ts";

vi.mock("$lib/shared/aarri.ts", () => ({
  sendDossierSearchEvent: vi.fn(),
  sendEvenement: vi.fn(),
}));

afterEach(async () => {
  cleanup();
  document.querySelector("#list-layout-test")?.remove();
  store.followRelations = undefined;
  store.notificationByDossier.clear();
  await page.viewport(1280, 720);
});

test.each([1440, 1024, 390])("list geometry and typography at %ipx", async (width) => {
  await page.viewport(width, 900);
  const target = document.createElement("div");
  target.id = "list-layout-test";
  target.className = "pitchou-container";
  document.body.append(target);
  store.followRelations = new SvelteMap([
    ["instructeur@example.org", new SvelteSet([dossierId(2)])],
  ]);
  const dossier = makeDossier({
    name: "Restauration des marais et protection des espaces naturels".repeat(4),
    demandeur_personne_morale_legal_name: "Association de protection des espaces naturels".repeat(
      4,
    ),
    location_scope: "france",
    phase: "Accompagnement amont",
    next_action_expected_from: "Tierce personne/administration",
    enjeu: true,
    next_due_date: new Date(),
  });
  store.notificationByDossier.set(
    dossier.id,
    makeNotification({
      new_follow: { revision: "1", detected_at: new Date() },
      changes: [
        {
          field: "name",
          label: "Nom du projet",
          revisions: [],
          detected_at: new Date(),
          modified_at: null,
        },
      ],
    }),
  );
  render(DossiersResults, {
    target,
    props: {
      dossiers: [dossier, { ...dossier, id: dossierId(2) }],
      sortKey: "depositDate",
      wholeListEmpty: false,
      followedIds: new Set([dossierId(2)]),
      notificationViewed: (id: typeof dossier.id) => id === dossierId(2),
      notificationUpdatedAt: () => null,
      follow: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
    },
  });
  await document.fonts.ready;

  const cards = within(target).getAllByTestId("card-dossier");
  const bounds = cards.map((card) => card.getBoundingClientRect());
  expect(bounds[1].top - bounds[0].bottom).toBe(8);
  const containerStyle = getComputedStyle(target);
  expect(
    target.clientWidth -
      parseFloat(containerStyle.paddingLeft) -
      parseFloat(containerStyle.paddingRight),
  ).toBe(width === 1440 ? 1200 : width === 1024 ? 976 : 358);
  expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
  expect(target.scrollWidth).toBe(target.clientWidth);
  for (const label of target.querySelectorAll("time > span:not(.fr-sr-only)")) {
    expect(label.scrollWidth).toBeLessThanOrEqual(label.parentElement!.clientWidth);
  }

  for (const card of cards) {
    expect(card.scrollWidth).toBe(card.clientWidth);
    const content = within(card);
    const title = content.getByRole("link", { name: dossier.name! });
    for (const element of [
      title,
      content.getByText(dossier.demandeur_personne_morale_legal_name!),
      content.getByText("France entière"),
      content.getByText(dossier.phase, { exact: true }),
      content.getByText(dossier.next_action_expected_from!, { exact: true }),
    ]) {
      expect(getComputedStyle(element).fontSize).toBe("14px");
      expect(getComputedStyle(element).lineHeight).toBe("24px");
    }
    const star = content.getByRole("button", { name: /^(Suivre|Ne plus suivre)$/ });
    expect(star.getBoundingClientRect().width).toBe(32);
    expect(star.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(star, "::before").width).toBe("24px");
    expect(getComputedStyle(star, "::before").height).toBe("24px");
    const enjeu = content.getByText("Dossier à enjeu");
    expect(getComputedStyle(enjeu).fontSize).toBe("12px");
    expect(enjeu.getBoundingClientRect().top - title.getBoundingClientRect().bottom).toBe(8);
    const badges = Array.from(card.children[4].children);
    for (const [index, badge] of badges.entries()) {
      expect(getComputedStyle(badge).fontSize).toBe("12px");
      if (badge.matches(".notification-badge")) {
        expect(getComputedStyle(badge).textTransform).toBe("uppercase");
      }
      if (index > 0) {
        expect(
          badge.getBoundingClientRect().top - badges[index - 1].getBoundingClientRect().bottom,
        ).toBe(8);
      }
      expect(badge.scrollWidth).toBeLessThanOrEqual(badge.clientWidth);
      const walker = document.createTreeWalker(badge, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        for (const match of node.textContent!.matchAll(/\S+/g)) {
          const word = document.createRange();
          word.setStart(node, match.index);
          word.setEnd(node, match.index + match[0].length);
          expect(word.getClientRects(), match[0]).toHaveLength(1);
        }
      }
    }
  }
  expect(cards[0].querySelectorAll(".notification-badge")).toHaveLength(2);

  const header = target.querySelector('[aria-hidden="true"]')!;
  if (width < 1024) {
    expect(getComputedStyle(header).display).toBe("none");
    expect(getComputedStyle(cards[0]).flexDirection).toBe("column");
    return;
  }
  const headerGrid = header.children[1];
  const labels = [
    "Nom du projet",
    "Pétitionnaire, localisation",
    "Avancement du dossier",
    "Prochaine action",
    "Alertes",
  ];
  const columns = Array.from(cards[0].children).map((column) => column.getBoundingClientRect());
  expect(columns[4].width).toBeGreaterThanOrEqual(136);
  for (const [index, text] of labels.entries()) {
    const label = within(headerGrid as HTMLElement).getByText(text);
    const box = label.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(label);
    expect(range.getClientRects()).toHaveLength(1);
    expect(range.getBoundingClientRect().width - box.width).toBeLessThan(0.1);
    expect(getComputedStyle(label).textOverflow).not.toBe("ellipsis");
    const expectedLeft =
      index === 0
        ? within(cards[0]).getByRole("link").getBoundingClientRect().left
        : columns[index].left;
    expect(box.left).toBe(expectedLeft);
    expect(headerGrid.children[index].getBoundingClientRect().width).toBe(columns[index].width);
  }
  expect(columns[1].left - columns[0].right).toBe(16);
  expect(within(cards[0]).getByRole("link").getBoundingClientRect().width).toBeGreaterThan(99.9);
  for (let index = 2; index < columns.length; index++) {
    expect(columns[index].left - columns[index - 1].right).toBe(width >= 1280 ? 32 : 16);
  }
});

test("notification badges are uppercase outside list cards too", () => {
  store.notificationByDossier.set(
    dossierId(1),
    makeNotification({
      new_arrival: { detected_at: new Date() },
    }),
  );
  const { getByText } = render(DossierNotificationBadges, { dossierId: dossierId(1) });
  expect(getComputedStyle(getByText("Nouveau dossier")).textTransform).toBe("uppercase");
});
