import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import { page, userEvent } from "vitest/browser";
import CardDossier from "./CardDossier.svelte";
import { dossierId, makeDossier } from "./testHelpers.ts";

vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));

afterEach(async () => {
  cleanup();
  document.querySelector("#stacking-test")?.remove();
  await page.viewport(1280, 720);
});

test("an open card menu covers subsequent card controls until closed", async () => {
  await page.viewport(1440, 900);
  const target = document.createElement("div");
  target.id = "stacking-test";
  target.className = "pitchou-container flex flex-col gap-2";
  document.body.append(target);
  for (const id of [1, 2]) {
    render(CardDossier, {
      target,
      props: {
        dossier: makeDossier({ id: dossierId(id), name: `Projet ${id}` }),
        dossierFollowedByCurrentInstructeur: false,
        notificationViewed: true,
        currentInstructeurFollowsDossier: vi.fn(),
        currentInstructeurLeavesDossier: vi.fn(),
      },
    });
  }
  const first = screen.getByRole("button", { name: "Plus d’actions pour Projet 1" });
  const second = screen.getByRole("button", { name: "Plus d’actions pour Projet 2" });
  await userEvent.click(first);
  const menu = screen.getByRole("menu");
  const button = second.getBoundingClientRect();
  const x = button.left + button.width / 2;
  const y = button.top + button.height / 2;
  const bounds = menu.getBoundingClientRect();
  expect(y).toBeGreaterThan(bounds.top);
  expect(y).toBeLessThan(bounds.bottom);
  expect(menu.contains(document.elementFromPoint(x, y))).toBe(true);
  await userEvent.keyboard("{Escape}");
  expect(first).toHaveFocus();
  expect(screen.queryByRole("menu")).toBeNull();
  expect(second.contains(document.elementFromPoint(x, y))).toBe(true);
});
