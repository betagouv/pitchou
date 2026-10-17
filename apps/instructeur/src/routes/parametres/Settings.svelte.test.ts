import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../app.css";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/svelte";
import { page, userEvent } from "vitest/browser";
import Settings from "./+page.svelte";
import { store } from "$lib/state/store.svelte.ts";

beforeEach(async () => {
  await page.viewport(1280, 900);
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
  document.documentElement.removeAttribute("data-fr-theme");
});
test("loads saved values and saves independent preferences", async () => {
  store.capabilities.getEmailNotificationPreferences = vi
    .fn()
    .mockResolvedValue({ assignment: true, novelty: true });
  const save = vi.fn().mockImplementation(async (values) => values);
  store.capabilities.updateEmailNotificationPreferences = save;
  render(Settings);
  await waitFor(() => expect(screen.getAllByRole("radio", { name: "Activé" })).toHaveLength(2));
  const assignment = within(
    screen.getByRole("group", {
      name: "Attributions de dossiers",
    }),
  );
  await document.fonts.ready;
  await userEvent.click(assignment.getByText("Désactivé", { selector: "label" }));
  await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  expect(save).toHaveBeenCalledWith({ assignment: false, novelty: true });
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("enregistrés"));
});
test("displays a save failure and allows retry", async () => {
  store.capabilities.getEmailNotificationPreferences = vi
    .fn()
    .mockResolvedValue({ assignment: false, novelty: true });
  store.capabilities.updateEmailNotificationPreferences = vi
    .fn()
    .mockRejectedValue(new Error("offline"));
  render(Settings);
  await waitFor(() => expect(screen.getByRole("button", { name: "Enregistrer" })).toBeTruthy());
  await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Réessayez"));
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
});

test.each(
  [320, 768, 1440].flatMap((width) => ["light", "dark"].map((theme) => ({ width, theme }))),
)(
  "keeps descriptions and controls separate at $width px in $theme mode",
  async ({ width, theme }) => {
    await page.viewport(width, 900);
    document.documentElement.dataset.frTheme = theme;
    store.capabilities.getEmailNotificationPreferences = vi
      .fn()
      .mockResolvedValue({ assignment: true, novelty: false });
    const { container } = render(Settings);
    container.className = "fr-container";
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(4));
    await document.fonts.ready;
    const groups = screen.getAllByRole("group");
    const controls = groups.map((group) => {
      const radios = within(group).getAllByRole("radio");
      const choices = radios[0].parentElement!.parentElement!.getBoundingClientRect();
      const description = group.querySelector("p:last-child")!.getBoundingClientRect();
      expect(
        Math.abs(radios[0].getBoundingClientRect().top - radios[1].getBoundingClientRect().top),
      ).toBeLessThan(1);
      if (width >= 768) expect(choices.left).toBeGreaterThanOrEqual(description.right + 24);
      else expect(choices.top).toBeGreaterThanOrEqual(description.bottom + 16);
      expect(choices.width).toBeGreaterThan(150);
      return choices;
    });
    expect(controls[1].top).toBeGreaterThan(controls[0].bottom);
    expect(Math.abs(controls[0].left - controls[1].left)).toBeLessThan(1);
    const panel = screen.getByRole("region", { name: "Notifications par mail" });
    expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(864);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(within(groups[0]).getByRole("radio", { name: "Activé" })).toBeChecked();
    expect(within(groups[1]).getByRole("radio", { name: "Désactivé" })).toBeChecked();
  },
);
