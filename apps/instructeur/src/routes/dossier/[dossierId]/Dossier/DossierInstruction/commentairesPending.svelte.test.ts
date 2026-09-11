import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import type { DossierCommentaire } from "@pitchou/types/capabilities.ts";
import { setDossierFull, store } from "$lib/state/store.svelte.ts";
import { fakeDossierFull } from "../../../../fakeDossier.ts";
import Commentaires from "./Commentaires.svelte";

vi.mock("$env/dynamic/public", () => ({ env: {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock(import("../readOnly.ts"), () => ({
  readOnlyMode: () => ({ current: false }),
  provideReadOnly: vi.fn(),
}));

const email = "author@example.fr";
const dossier = fakeDossierFull({ latestCommentaire: "Newest comment" });
const list: DossierCommentaire[] = [
  {
    id: "newest",
    content: "Newest comment",
    author_email: email,
    created_at: "2026-08-02",
    updated_at: null,
  },
  {
    id: "older",
    content: "Older comment",
    author_email: email,
    created_at: "2026-08-01",
    updated_at: null,
  },
];

beforeEach(() => {
  setDossierFull(dossier);
  store.capabilities = {
    listerCommentaires: vi.fn(async () => [...list]),
    ajouterCommentaire: vi.fn(),
    modifierCommentaire: vi.fn(),
    supprimerCommentaire: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
});

test.each([false, true])(
  "new comment stays locked until the request settles, failure=%s",
  async (fails) => {
    const response = Promise.withResolvers<DossierCommentaire>();
    store.capabilities.ajouterCommentaire = vi.fn(() => response.promise);
    render(Commentaires, { dossier, email });
    await screen.findByText("Newest comment");
    const input = screen.getByRole("textbox", { name: "Laissez un commentaire" });
    await fireEvent.input(input, { target: { value: "Draft to save" } });
    const form = input.closest("form")!;
    await fireEvent.submit(form);
    await fireEvent.submit(form);
    expect(store.capabilities.ajouterCommentaire).toHaveBeenCalledOnce();
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Commenter" })).toBeDisabled();

    if (fails) {
      response.reject(new Error("Save failed"));
      await screen.findByText("Le commentaire n'a pas pu être enregistré.");
      expect(input).toHaveValue("Draft to save");
      expect(screen.getByRole("button", { name: "Commenter" })).not.toBeDisabled();
      expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe("Newest comment");
      store.capabilities.ajouterCommentaire = vi
        .fn()
        .mockResolvedValue({ ...list[0], id: "added", content: "Draft to save" });
      await fireEvent.submit(form);
    } else {
      response.resolve({ ...list[0], id: "added", content: "Draft to save" });
    }
    await screen.findByText("Draft to save");
    expect(input).not.toBeDisabled();
    expect(input).toHaveValue("");
    expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe("Draft to save");
  },
);

test.each([false, true])(
  "pending comment edit cannot be submitted twice or replaced, failure=%s",
  async (fails) => {
    const response = Promise.withResolvers<void>();
    store.capabilities.modifierCommentaire = vi.fn(() => response.promise);
    render(Commentaires, { dossier, email });
    await screen.findByText("Newest comment");
    await fireEvent.click(screen.getAllByRole("button", { name: "Actions du commentaire" })[0]);
    await fireEvent.click(screen.getByRole("menuitem", { name: "Modifier" }));
    const input = screen.getByRole("textbox", { name: "Modifier le commentaire" });
    await fireEvent.input(input, { target: { value: "Edited draft" } });
    const save = screen.getByRole("button", { name: "Enregistrer" });
    await fireEvent.click(save);
    await fireEvent.click(save);
    expect(store.capabilities.modifierCommentaire).toHaveBeenCalledOnce();
    expect(input).toBeDisabled();
    expect(save).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
    await fireEvent.click(screen.getByRole("button", { name: "Actions du commentaire" }));
    expect(screen.queryByRole("menuitem", { name: "Modifier" })).toBeNull();
    await fireEvent.keyDown(window, { key: "Escape" });

    if (fails) {
      response.reject(new Error("Save failed"));
      await screen.findByText("Le commentaire n'a pas pu être modifié.");
      expect(input).toHaveValue("Edited draft");
      expect(input).not.toBeDisabled();
      expect(save).not.toBeDisabled();
      expect(screen.getByRole("button", { name: "Annuler" })).not.toBeDisabled();
      expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe("Newest comment");
      store.capabilities.modifierCommentaire = vi.fn().mockResolvedValue(undefined);
      await fireEvent.click(save);
    } else {
      response.resolve();
    }
    await screen.findByText("Edited draft");
    expect(screen.queryByRole("textbox", { name: "Modifier le commentaire" })).toBeNull();
    await fireEvent.click(screen.getAllByRole("button", { name: "Actions du commentaire" })[1]);
    await fireEvent.click(screen.getByRole("menuitem", { name: "Modifier" }));
    expect(screen.getByRole("textbox", { name: "Modifier le commentaire" })).toHaveValue(
      "Older comment",
    );
  },
);
