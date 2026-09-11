import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../../../app.css";
import type { DossierCommentaire } from "@pitchou/types/capabilities.ts";
import { setDossierFull, store } from "$lib/state/store.svelte.ts";
import { fakeDossierFull } from "../../../../fakeDossier.ts";
import Commentaires from "./Commentaires.svelte";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

vi.mock("$env/dynamic/public", () => ({ env: {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

const readOnly = vi.hoisted(() => ({ current: false }));
vi.mock(import("../readOnly.ts"), () => ({
  readOnlyMode: () => readOnly,
  provideReadOnly: vi.fn(),
}));

const email = "author@example.fr";
const dossier = fakeDossierFull({ latestCommentaire: "Newest comment" });
let list: DossierCommentaire[];

beforeEach(() => {
  readOnly.current = false;
  list = [
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
  setDossierFull(dossier);
  store.capabilities = {
    listerCommentaires: vi.fn(async () => [...list]),
    ajouterCommentaire: vi.fn(),
    modifierCommentaire: vi.fn().mockResolvedValue(undefined),
    supprimerCommentaire: vi.fn(async (_dossierId, id) => {
      list = list.filter((commentaire) => commentaire.id !== id);
    }),
  };
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
});

test("a full refresh started before a comment save cannot replace the new summary", async () => {
  const response = Promise.withResolvers<DossierFull>();
  const fetch = vi.fn(() => response.promise);
  store.capabilities.recupérerDossierComplet = fetch;
  store.capabilities.ajouterCommentaire = vi.fn(async (_id, content) => ({
    ...list[0],
    id: "added",
    content,
  }));
  render(Commentaires, { dossier, email });
  await screen.findByText("Newest comment");
  const refresh = refreshDossierFull(dossier.id);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  const input = screen.getByRole("textbox");
  await fireEvent.input(input, { target: { value: "Saved during refresh" } });
  await fireEvent.submit(input.closest("form")!);
  await vi.waitFor(() =>
    expect(store.fullDossiers.get(dossier.id)?.latestCommentaire).toBe("Saved during refresh"),
  );
  response.resolve(dossier);
  await refresh;
  expect(store.fullDossiers.get(dossier.id)?.latestCommentaire).toBe("Saved during refresh");
  expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe("Saved during refresh");
});

async function openDelete() {
  await fireEvent.click(screen.getAllByRole("button", { name: "Actions du commentaire" })[0]);
  await fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer" }));
  await expect.element(screen.getByRole("alertdialog")).toBeVisible();
}

test("deletion requires confirmation and refreshes both caches through the last comment", async () => {
  render(Commentaires, { dossier, email });
  await screen.findByText("Newest comment");
  expect(screen.getByRole("heading", { name: "Commentaires", level: 4 })).toBeTruthy();
  await openDelete();
  expect(store.capabilities.supprimerCommentaire).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Actions du commentaire" })[0]).toHaveFocus();

  // A concurrent update to another dossier field must not be overwritten by the prop snapshot.
  setDossierFull({ ...dossier, name: "Updated dossier name" });
  for (const [id, latest] of [
    ["newest", "Older comment"],
    ["older", null],
  ] as const) {
    await openDelete();
    await fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
    await expect.poll(() => screen.queryByRole("alertdialog")).toBeNull();
    expect(store.capabilities.supprimerCommentaire).toHaveBeenLastCalledWith(dossier.id, id);
    expect(store.fullDossiers.get(dossier.id)).toMatchObject({
      latestCommentaire: latest,
      name: "Updated dossier name",
    });
    expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe(latest);
  }
  expect(screen.queryByText("Newest comment")).toBeNull();
  expect(screen.queryByText("Older comment")).toBeNull();
  expect(screen.getByText("Aucun commentaire pour l'instant.")).toBeTruthy();
});

test("failed deletion keeps the comment, cached latest value and a retryable confirmation", async () => {
  store.capabilities.supprimerCommentaire = vi.fn().mockRejectedValue(new Error("Forbidden"));
  render(Commentaires, { dossier, email });
  await screen.findByText("Newest comment");
  await openDelete();
  await fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
  await screen.findByRole("alert");
  expect(screen.getByText("Newest comment")).toBeTruthy();
  expect(store.fullDossiers.get(dossier.id)?.latestCommentaire).toBe("Newest comment");
  expect(screen.getByRole("button", { name: "Confirmer la suppression" })).not.toBeDisabled();
});

test("the ellipsis is author-only and still opens the inline editor", async () => {
  list[1].author_email = "someone-else@example.fr";
  list.push({ ...list[1], id: "initial", author_email: null });
  render(Commentaires, { dossier, email });
  await screen.findByText("Newest comment");
  expect(screen.getAllByRole("button", { name: "Actions du commentaire" })).toHaveLength(1);
  const trigger = screen.getByRole("button", { name: "Actions du commentaire" });
  const buttonBox = trigger.getBoundingClientRect();
  const iconBox = trigger.querySelector("svg")!.getBoundingClientRect();
  expect(iconBox.width).toBe(24);
  expect(iconBox.height).toBe(24);
  expect(iconBox.left + iconBox.width / 2).toBe(buttonBox.left + buttonBox.width / 2);
  expect(iconBox.top + iconBox.height / 2).toBe(buttonBox.top + buttonBox.height / 2);
  await fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(screen.getByRole("menuitem", { name: "Modifier" })).toHaveFocus();
  await fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(screen.getByRole("menuitem", { name: "Supprimer" })).toHaveFocus();
  await fireEvent.keyDown(window, { key: "Escape" });
  expect(trigger).toHaveFocus();
  await fireEvent.click(trigger);
  await fireEvent.click(screen.getByRole("menuitem", { name: "Modifier" }));
  const input = screen.getByRole("textbox", { name: "Modifier le commentaire" });
  expect(input).toHaveFocus();
  await fireEvent.input(input, { target: { value: "Edited comment" } });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByText("Edited comment");
  expect(store.capabilities.modifierCommentaire).toHaveBeenCalledWith(dossier.id, {
    id: "newest",
    content: "Edited comment",
  });
  expect(store.dossierSummaries.get(dossier.id)?.latestCommentaire).toBe("Edited comment");
});

test("read-only mode exposes no mutation controls even for the author", async () => {
  readOnly.current = true;
  render(Commentaires, { dossier, email });
  await screen.findByText("Newest comment");
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
});

test("comment metadata has no extra bottom margin and the author is centered with the avatar", async () => {
  render(Commentaires, { dossier, email });
  const content = await screen.findByText("Newest comment");
  const item = content.closest("li")!;
  const avatar = item.querySelector(":scope > span")!;
  const author = item.querySelector("strong")!;
  const metadata = author.parentElement!;
  const date = metadata.querySelector("span")!;
  expect(getComputedStyle(date).marginBottom).toBe("0px");
  expect(metadata.getBoundingClientRect().height).toBe(32);
  const avatarBox = avatar.getBoundingClientRect();
  const authorBox = author.getBoundingClientRect();
  expect(authorBox.top + authorBox.height / 2).toBe(avatarBox.top + avatarBox.height / 2);
  expect(content.getBoundingClientRect().top - metadata.getBoundingClientRect().bottom).toBe(4);
});
