import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen } from "@testing-library/svelte";
import HeaderActions from "./HeaderActions.svelte";
import DossierActionsMenu from "$lib/components/DossierFollowerAssignment/DossierActionsMenu.svelte";
import { fakeDossierFull } from "../../../../fakeDossier.ts";
import { instructeurFollowsDossier, instructeurLeavesDossier } from "$lib/dossier/suiviDossier.ts";

vi.mock("$lib/dossier/suiviDossier.ts", () => ({
  instructeurFollowsDossier: vi.fn(),
  instructeurLeavesDossier: vi.fn(),
  queueDossierFollowUpdate: vi.fn(),
}));
vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));

function props(follows = false) {
  return {
    dossier: fakeDossierFull(),
    email: "instructeur@example.com",
    followersLabel: "Suivi par alice",
    followedByCurrentInstructeur: follows,
    onOpenFollowers: vi.fn(),
    onAddPieceJointe: vi.fn(),
    onEnterReadOnly: vi.fn(),
  };
}

afterEach(async () => {
  cleanup();
  vi.clearAllMocks();
  document.documentElement.removeAttribute("data-fr-theme");
  await page.viewport(1280, 720);
});

test.each([false, true])(
  "header targets and 16px gaps survive mobile wrapping, followed=%s",
  async (follows) => {
    await page.viewport(1280, 720);
    const { rerender } = render(HeaderActions, props(follows));
    await document.fonts.ready;
    expect(document.fonts.check('16px "Marianne"')).toBe(true);
    expect(
      [...document.fonts].some((font) => font.family === "Marianne" && font.status === "loaded"),
    ).toBe(true);
    const [followers, follow, menu] = screen.getAllByRole("button");
    const bounds = [followers, follow, menu].map((button) => button.getBoundingClientRect());
    expect(bounds[1].left - bounds[0].right).toBe(16);
    expect(bounds[2].left - bounds[1].right).toBe(16);
    expect(bounds.map((box) => box.height)).toEqual([40, 40, 40]);
    expect(bounds[2].width).toBe(40);
    expect(bounds.map((box) => box.top)).toEqual([bounds[0].top, bounds[0].top, bounds[0].top]);
    expect(getComputedStyle(menu).boxShadow).toBe(getComputedStyle(follow).boxShadow);
    expect(getComputedStyle(menu).boxShadow).toContain("rgb(106, 106, 244)");
    expect(getComputedStyle(menu).borderRadius).toBe("4px");
    const glyph = menu.querySelector("svg")!.getBoundingClientRect();
    expect([glyph.width, glyph.height]).toEqual([24, 24]);
    for (const width of [390, 320]) {
      await page.viewport(width, 844);
      await rerender({
        ...props(follows),
        followersLabel: `Suivi par ${"instructrice.".repeat(12)}`,
      });
      for (const button of screen.getAllByRole("button")) {
        const box = button.getBoundingClientRect();
        expect(box.height).toBeGreaterThanOrEqual(40);
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
      }
      const linkBox = followers.getBoundingClientRect();
      const followBox = follow.getBoundingClientRect();
      const menuBox = menu.getBoundingClientRect();
      expect(followBox.top - linkBox.bottom).toBe(16);
      expect(menuBox.top).toBe(followBox.top);
      expect(menuBox.left - followBox.right).toBe(16);
    }
  },
);

test.each(["light", "dark"])(
  "header hover changes only the border in the %s theme while list controls retain DSFR backgrounds",
  async (theme) => {
    document.documentElement.dataset.frTheme = theme;
    const { rerender } = render(HeaderActions, props());
    render(DossierActionsMenu, { dossierId: props().dossier.id, dossierName: "Liste" });
    const list = screen.getByRole("button", { name: /Plus d’actions pour Liste/ });
    const probe = document.createElement("span");
    document.body.append(probe);
    try {
      for (const follows of [false, true]) {
        await rerender(props(follows));
        const follow = screen.getByRole("button", {
          name: follows ? "Vous suivez ce dossier" : "Suivre ce dossier",
        });
        const menu = screen.getByRole("button", { name: /Plus d’actions pour Dossier test/ });
        for (const button of [follow, menu, list]) {
          await userEvent.hover(screen.getByRole("button", { name: props().followersLabel }));
          const idle = getComputedStyle(button).backgroundColor;
          await userEvent.hover(button);
          probe.style.backgroundColor =
            button === list ? getComputedStyle(list).getPropertyValue("--hover") : idle;
          const hover = getComputedStyle(button).backgroundColor;
          expect(hover).toBe(getComputedStyle(probe).backgroundColor);
          if (button === list) expect(hover).not.toBe(idle);
          else expect(getComputedStyle(button).boxShadow).toContain("rgb(0, 0, 145)");
          expect(getComputedStyle(follow, "::before").color).toBe("rgb(106, 106, 244)");
          let active = false;
          let activeColor = "";
          button.addEventListener(
            "mousedown",
            () => {
              active = button.matches(":active");
              activeColor = getComputedStyle(button).backgroundColor;
            },
            { once: true },
          );
          await userEvent.click(button);
          probe.style.backgroundColor =
            button === list ? getComputedStyle(list).getPropertyValue("--active") : idle;
          expect(active).toBe(true);
          expect(activeColor).toBe(getComputedStyle(probe).backgroundColor);
          if (button === list) expect(activeColor).not.toBe(hover);
          await userEvent.keyboard("{Escape}");
        }
      }
      const box = list.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([24, 24]);
      expect(getComputedStyle(list).boxShadow).toBe("none");
      expect(getComputedStyle(list).borderWidth).toBe("0px");
      await userEvent.hover(list);
      probe.style.backgroundColor = "var(--background-action-low-blue-france-hover)";
      expect(getComputedStyle(list).backgroundColor).not.toBe(
        getComputedStyle(probe).backgroundColor,
      );
    } finally {
      probe.remove();
    }
  },
);

test("header callbacks, labels and extra icons stay intact", async () => {
  const callbacks = props();
  const { rerender } = render(HeaderActions, callbacks);
  await userEvent.click(screen.getByRole("button", { name: "Suivre ce dossier" }));
  expect(instructeurFollowsDossier).toHaveBeenCalledExactlyOnceWith(
    callbacks.email,
    callbacks.dossier.id,
  );
  await rerender({ ...callbacks, followedByCurrentInstructeur: true });
  await userEvent.click(screen.getByRole("button", { name: "Vous suivez ce dossier" }));
  expect(instructeurLeavesDossier).toHaveBeenCalledExactlyOnceWith(
    callbacks.email,
    callbacks.dossier.id,
  );
  await userEvent.click(screen.getByRole("button", { name: callbacks.followersLabel }));
  expect(callbacks.onOpenFollowers).toHaveBeenCalledOnce();
  for (const [label, icon, callback] of [
    ["Ajouter une pièce jointe", "fr-icon-attachment-line", callbacks.onAddPieceJointe],
    ["Voir le dossier en lecture seule", "fr-icon-eye-line", callbacks.onEnterReadOnly],
  ] as const) {
    await userEvent.click(screen.getByRole("button", { name: /Plus d’actions/ }));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual([
      "Faire suivre le dossier",
      "Ajouter une pièce jointe",
      "Voir le dossier en lecture seule",
    ]);
    const item = screen.getByRole("menuitem", { name: label });
    expect(item.querySelector(`.${icon}`)).toHaveAttribute("aria-hidden", "true");
    await userEvent.click(item);
    expect(callback).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  }
});
