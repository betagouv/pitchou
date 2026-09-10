import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, screen } from "@testing-library/svelte";
import "@gouvfr/dsfr/dist/dsfr.css";

import DossierInstruction from "./DossierInstruction.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { reactive } from "../../../../../tests/helpers/reactive.svelte.ts";
import { fakeDossierFull } from "../../../fakeDossier.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const DOSSIER_ID = 123 as DossierId;

/** A dossier as loaded from the server: the Onagre number is absent, so null. */
function fakeDossier(): DossierFull {
  return reactive(fakeDossierFull({ id: DOSSIER_ID }));
}

beforeEach(() => {
  store.capabilities = {
    modifierDossier: vi.fn().mockResolvedValue(undefined),
  } as unknown as PitchouState["capabilities"];
});

afterEach(() => {
  cleanup();
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
  store.capabilities = {};
});

test("afficher l'onglet instruction n'enregistre rien", async () => {
  render(DossierInstruction, { dossier: fakeDossier(), email: "instructeur@example.com" });

  await expect.element(screen.getByLabelText("N° de dossier Onagre")).toBeVisible();

  // Longer than the one-second debounce of the Onagre field, so a save queued
  // at mount would have landed by now.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  expect(store.capabilities.modifierDossier).not.toHaveBeenCalled();
  // Successful saves are reported to the header, not as an in-form alert.
  expect(screen.queryByText("Le dossier a bien été mis à jour.")).toBeNull();
});

test("saisir un numéro Onagre enregistre le dossier", async () => {
  const dossier = fakeDossier();
  dossier.next_action_expected = "Envoyer la saisine";
  render(DossierInstruction, { dossier, email: "instructeur@example.com" });

  await page.getByLabelText("N° de dossier Onagre").fill("ONAGRE-98765");

  // The field is debounced by a second, so the save lands after typing.
  await vi.waitFor(
    () =>
      expect(store.capabilities.modifierDossier).toHaveBeenCalledWith(DOSSIER_ID, {
        onagre_demande_identifier: "ONAGRE-98765",
      }),
    { timeout: 5000 },
  );
});

test("les titres de section sont de niveau 4", () => {
  render(DossierInstruction, { dossier: fakeDossier(), email: "instructeur@example.com" });
  expect(screen.getByRole("heading", { name: "Avancement du dossier", level: 4 })).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Informations liées au dossier", level: 4 }),
  ).toBeTruthy();
});

test.each([
  { initial: false, label: "Oui", expected: true },
  { initial: true, label: "Non", expected: false },
])("enjeu only offers boolean choices and saves $label", async ({ initial, label, expected }) => {
  const dossier = fakeDossier();
  dossier.enjeu = initial;
  render(DossierInstruction, { dossier, email: "instructeur@example.com" });

  await page.getByLabelText("Dossier à enjeu").click();
  expect(screen.getAllByRole("option").map((option) => option.textContent?.trim())).toEqual([
    "Oui",
    "Non",
  ]);
  await page.getByRole("option", { name: label, exact: true }).click();
  await vi.waitFor(() =>
    expect(store.capabilities.modifierDossier).toHaveBeenCalledExactlyOnceWith(DOSSIER_ID, {
      enjeu: expected,
    }),
  );
});

test("reselecting the current phase does not mask a later dossier refresh", async () => {
  const dossier = fakeDossier();
  const onSaved = vi.fn();
  const { rerender } = render(DossierInstruction, {
    dossier,
    email: "instructeur@example.com",
    onSaved,
  });

  await page.getByLabelText("Phase en cours").click();
  await page.getByRole("option", { name: "Accompagnement amont", exact: true }).click();
  expect(store.capabilities.modifierDossier).not.toHaveBeenCalled();

  await rerender({
    dossier: fakeDossierFull({
      id: DOSSIER_ID,
      evenementsPhase: [
        {
          dossier: DOSSIER_ID,
          timestamp: new Date("2026-09-01"),
          phase: "Instruction",
          caused_by_personne: null,
          demarche_numerique_agent_email: null,
          demarche_numerique_motivation: null,
        },
      ],
    }),
    email: "instructeur@example.com",
    onSaved,
  });

  await expect.element(page.getByLabelText("Phase en cours")).toHaveTextContent("Instruction");
  expect(store.capabilities.modifierDossier).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});

test("public consultation uses a loadable filled megaphone mask", async () => {
  const { container } = render(DossierInstruction, {
    dossier: fakeDossier(),
    email: "instructeur@example.com",
  });
  const icon = container.querySelector("#consultation-du-public-label > span")!;
  const style = getComputedStyle(icon, "::before");
  expect(style.width).toBe("16px");
  expect(style.height).toBe("16px");
  expect(style.maskImage).toContain("megaphone-fill.svg");
  const url = style.maskImage.match(/^url\("(.+)"\)$/)![1];
  const response = await fetch(url);
  expect(response.ok).toBe(true);
  expect(await response.text()).toContain("<path");
});

test("choisir une entité efface la tâche et signale seulement la sauvegarde réussie", async () => {
  const dossier = fakeDossier();
  dossier.next_action_expected_from = "Instructeur";
  dossier.next_action_expected = "Envoyer la saisine";
  const onSaved = vi.fn();
  let resolveSave!: () => void;
  store.capabilities.modifierDossier = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
  );
  render(DossierInstruction, { dossier, email: "instructeur@example.com", onSaved });

  expect(onSaved).not.toHaveBeenCalled();
  await page.getByLabelText("Entité en charge de la prochaine action").click();
  expect(screen.queryByRole("option", { name: "Envoyer la saisine" })).toBeNull();
  await page.getByRole("option", { name: "Tierce personne/administration", exact: true }).click();
  await vi.waitFor(() =>
    expect(store.capabilities.modifierDossier).toHaveBeenCalledExactlyOnceWith(DOSSIER_ID, {
      next_action_expected_from: "Tierce personne/administration",
      next_action_expected: null,
    }),
  );
  expect(onSaved).not.toHaveBeenCalled();
  resolveSave();
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(screen.queryByText("Le dossier a bien été mis à jour.")).toBeNull();
});

test("une entité inchangée ne déclenche ni sauvegarde ni confirmation", async () => {
  const dossier = fakeDossier();
  dossier.next_action_expected_from = "Instructeur";
  const onSaved = vi.fn();
  render(DossierInstruction, { dossier, email: "instructeur@example.com", onSaved });
  await page.getByLabelText("Entité en charge de la prochaine action").click();
  await page.getByRole("option", { name: "Instructeur-ice (Moi)", exact: true }).click();
  expect(store.capabilities.modifierDossier).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});

test("une erreur de sauvegarde reste visible et ne déclenche pas onSaved", async () => {
  store.capabilities.modifierDossier = vi.fn().mockRejectedValue(new Error("Save failed"));
  const onSaved = vi.fn();
  render(DossierInstruction, { dossier: fakeDossier(), email: "instructeur@example.com", onSaved });
  await page.getByLabelText("Entité en charge de la prochaine action").click();
  await page.getByRole("option", { name: "Préfet-e", exact: true }).click();
  await expect
    .element(page.getByText("Quelque chose s'est mal passé du côté serveur."))
    .toBeVisible();
  expect(onSaved).not.toHaveBeenCalled();
});
