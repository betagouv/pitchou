import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/svelte";
import { userEvent } from "vitest/browser";
import Settings from "./+page.svelte";
import { store } from "$lib/state/store.svelte.ts";

afterEach(() => {
  cleanup();
  store.capabilities = {};
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
      name: "Nouveaux dossiers attribués pour suivi par une autre personne",
    }),
  );
  await userEvent.click(assignment.getByRole("radio", { name: "Désactivé" }));
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
