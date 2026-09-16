import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
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
const newest: DossierCommentaire = {
  id: "newest",
  content: "Newest comment",
  author_email: email,
  created_at: "2026-08-02",
  updated_at: null,
};
const older = { ...newest, id: "older", content: "Older comment" };
const added = { ...newest, id: "added", content: "Saved comment" };
const list = [newest, older];

beforeEach(() => {
  setDossierFull(dossier);
  store.capabilities = {
    listerCommentaires: vi.fn().mockResolvedValue(list),
    ajouterCommentaire: vi.fn().mockResolvedValue(added),
    modifierCommentaire: vi.fn().mockResolvedValue(undefined),
    supprimerCommentaire: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
});

async function refresh() {
  const response = Promise.withResolvers<DossierCommentaire[]>();
  store.capabilities.listerCommentaires = vi.fn(() => response.promise);
  await tick();
  expect(store.capabilities.listerCommentaires).toHaveBeenCalledOnce();
  return response;
}

test("initial listing blocks submission and preserves existing comments when adding", async () => {
  const response = Promise.withResolvers<DossierCommentaire[]>();
  store.capabilities.listerCommentaires = vi.fn(() => response.promise);
  render(Commentaires, { dossier, email });
  const input = screen.getByRole("textbox", { name: "Laissez un commentaire" });
  expect(input).toBeDisabled();
  await fireEvent.input(input, { target: { value: added.content } });
  await fireEvent.submit(input.closest("form")!);
  expect(store.capabilities.ajouterCommentaire).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Commenter" })).toBeDisabled();

  const current = await refresh();
  response.resolve([newest]);
  await tick();
  expect(input).toBeDisabled();
  current.resolve(list);
  await screen.findByText(older.content);
  expect(input).not.toBeDisabled();
  await fireEvent.submit(input.closest("form")!);
  await screen.findByText(added.content);
  expect(screen.getByText(newest.content)).toBeTruthy();
  expect(screen.getByText(older.content)).toBeTruthy();
  expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe(added.content);
});

test.each(["add", "edit", "delete"])(
  "a pending list cannot overwrite a saved %s",
  async (operation) => {
    const saved = Promise.withResolvers<void>();
    store.capabilities.ajouterCommentaire = vi.fn(async () => {
      await saved.promise;
      return added;
    });
    store.capabilities.modifierCommentaire = vi.fn(() => saved.promise);
    store.capabilities.supprimerCommentaire = vi.fn(() => saved.promise);
    render(Commentaires, { dossier, email });
    await screen.findByText(newest.content);
    const response = await refresh();

    if (operation === "add") {
      const input = screen.getByRole("textbox", { name: "Laissez un commentaire" });
      await fireEvent.input(input, { target: { value: added.content } });
      await fireEvent.submit(input.closest("form")!);
      expect(store.capabilities.ajouterCommentaire).toHaveBeenCalledOnce();
    } else {
      await fireEvent.click(screen.getAllByRole("button", { name: "Actions du commentaire" })[0]);
      await fireEvent.click(
        screen.getByRole("menuitem", {
          name: operation === "edit" ? "Modifier" : "Supprimer",
        }),
      );
      if (operation === "edit") {
        await fireEvent.input(screen.getByRole("textbox", { name: "Modifier le commentaire" }), {
          target: { value: added.content },
        });
        await fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
        expect(store.capabilities.modifierCommentaire).toHaveBeenCalledOnce();
      } else {
        await fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
        expect(store.capabilities.supprimerCommentaire).toHaveBeenCalledOnce();
      }
    }
    // Also invalidate a listing restarted while the mutation is still pending.
    const restarted = await refresh();
    saved.resolve();
    const latest = operation === "delete" ? older.content : added.content;
    await vi.waitFor(() =>
      expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe(latest),
    );
    restarted.resolve(list);
    response.resolve(list);
    await tick();
    expect(screen.getByText(latest)).toBeTruthy();
    expect(screen.getByText(older.content)).toBeTruthy();
    if (operation !== "add") expect(screen.queryByText(newest.content)).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(
      operation === "add" ? 3 : operation === "edit" ? 2 : 1,
    );
  },
);

test.each([false, true])(
  "superseded listing cannot replace a newer result, failure=%s",
  async (fails) => {
    render(Commentaires, { dossier, email });
    await screen.findByText(newest.content);
    const stale = await refresh();
    const current = await refresh();
    current.resolve([added, ...list]);
    await screen.findByText(added.content);
    if (fails) stale.reject(new Error("Old listing failed"));
    else stale.resolve(list);
    await tick();
    await tick();
    expect(screen.getByText(added.content)).toBeTruthy();
    expect(screen.queryByText("Les commentaires n'ont pas pu être chargés.")).toBeNull();
  },
);

test("a refresh finishing during an add does not unlock it or duplicate the saved comment", async () => {
  const saved = Promise.withResolvers<DossierCommentaire>();
  store.capabilities.ajouterCommentaire = vi.fn(() => saved.promise);
  render(Commentaires, { dossier, email });
  await screen.findByText(newest.content);
  const input = screen.getByRole("textbox", { name: "Laissez un commentaire" });
  await fireEvent.input(input, { target: { value: added.content } });
  await fireEvent.submit(input.closest("form")!);
  const response = await refresh();
  response.resolve([added, ...list]);
  await screen.findByText(added.content);
  expect(input).toBeDisabled();
  await fireEvent.submit(input.closest("form")!);
  expect(store.capabilities.ajouterCommentaire).toHaveBeenCalledOnce();
  saved.resolve(added);
  await tick();
  expect(input).not.toBeDisabled();
  expect(screen.getAllByText(added.content)).toHaveLength(1);
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
});

test("failed initial listing keeps mutations blocked", async () => {
  const response = Promise.withResolvers<DossierCommentaire[]>();
  store.capabilities.listerCommentaires = vi.fn(() => response.promise);
  render(Commentaires, { dossier, email });
  response.reject(new Error("Listing failed"));
  await screen.findByText("Les commentaires n'ont pas pu être chargés.");
  expect(screen.getByRole("textbox")).toBeDisabled();
});

test.each([false, true])("listing can settle after disposal, failure=%s", async (fails) => {
  const view = render(Commentaires, { dossier, email });
  await screen.findByText(newest.content);
  const response = await refresh();
  view.unmount();
  if (fails) response.reject(new Error("Disposed listing failed"));
  else response.resolve([added]);
  await tick();
  await tick();
  expect(view.container).toBeEmptyDOMElement();
  expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe(newest.content);
});
