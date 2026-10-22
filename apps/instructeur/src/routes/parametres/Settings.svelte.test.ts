import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../app.css";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/svelte";
import { page, userEvent } from "vitest/browser";
import Settings from "./NotificationSettings.svelte";
import { store } from "#lib/state/store.svelte.ts";

beforeEach(async () => {
  await page.viewport(1280, 900);
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
  delete document.documentElement.dataset.frTheme;
});
test("loads saved values and saves independent preferences", async () => {
  store.capabilities.getEmailNotificationPreferences = vi
    .fn()
    .mockResolvedValue({ assignment: true, novelty: true, arrival: true });
  const save = vi.fn().mockImplementation(async (values) => values);
  store.capabilities.updateEmailNotificationPreferences = save;
  render(Settings);
  await waitFor(() => expect(screen.getAllByRole("radio", { name: "Activé" })).toHaveLength(3));
  const assignment = within(
    screen.getByRole("group", {
      name: "Attributions de dossiers",
    }),
  );
  await document.fonts.ready;
  await userEvent.click(assignment.getByText("Désactivé", { selector: "label" }));
  await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  expect(save).toHaveBeenCalledWith({ assignment: false, novelty: true, arrival: true });
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("enregistrés"));
});
test("displays a save failure and allows retry", async () => {
  store.capabilities.getEmailNotificationPreferences = vi
    .fn()
    .mockResolvedValue({ assignment: false, novelty: true, arrival: true });
  store.capabilities.updateEmailNotificationPreferences = vi
    .fn()
    .mockRejectedValue(new Error("offline"));
  render(Settings);
  await waitFor(() => expect(screen.getByRole("button", { name: "Enregistrer" })).toBeTruthy());
  await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Réessayez"));
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
});

test("saves the group arrival preference independently and reloads it", async () => {
  let saved = { arrival: true, assignment: true, novelty: true };
  store.capabilities.getEmailNotificationPreferences = vi
    .fn()
    .mockImplementation(async () => ({ ...saved }));
  const save = vi.fn().mockImplementation(async (values) => (saved = { ...values }));
  store.capabilities.updateEmailNotificationPreferences = save;
  render(Settings);
  const group = await screen.findByRole("group", {
    name: "Nouveaux dossiers dans mon groupe instructeur",
  });
  await document.fonts.ready;
  await userEvent.click(within(group).getByText("Désactivé", { selector: "label" }));
  await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({ arrival: false, assignment: true, novelty: true }),
  );
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("enregistrés"));
  cleanup();
  render(Settings);
  const reloaded = await screen.findByRole("group", {
    name: "Nouveaux dossiers dans mon groupe instructeur",
  });
  expect(within(reloaded).getByRole("radio", { name: "Désactivé" })).toBeChecked();
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
      .mockResolvedValue({ assignment: true, novelty: false, arrival: true });
    const { container } = render(Settings);
    container.className = "fr-container";
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(6));
    await document.fonts.ready;
    const groups = screen.getAllByRole("group");
    const controls = groups.map((group) => {
      const radios = within(group).getAllByRole("radio");
      const choices = radios[0].parentElement!.parentElement!.getBoundingClientRect();
      const description = group.querySelector("p:last-child")!.getBoundingClientRect();
      expect(
        Math.abs(radios[0].getBoundingClientRect().top - radios[1].getBoundingClientRect().top),
      ).toBeLessThan(1);
      if (width >= 1280) expect(choices.left).toBeGreaterThanOrEqual(description.right + 24);
      else expect(choices.top).toBeGreaterThanOrEqual(description.bottom + 16);
      expect(choices.width).toBeGreaterThan(150);
      return choices;
    });
    expect(controls[1].top).toBeGreaterThan(controls[0].bottom);
    expect(controls[2].top).toBeGreaterThan(controls[1].bottom);
    expect(Math.abs(controls[0].left - controls[1].left)).toBeLessThan(1);
    expect(container.querySelector("section")).toBeNull();
    expect(container.querySelector("h1, h2")).toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(within(groups[0]).getByRole("radio", { name: "Activé" })).toBeChecked();
    expect(within(groups[2]).getByRole("radio", { name: "Désactivé" })).toBeChecked();
  },
);
