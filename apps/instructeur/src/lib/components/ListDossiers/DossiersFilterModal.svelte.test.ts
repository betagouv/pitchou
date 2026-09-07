import { expect, test, beforeEach, afterEach } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";

import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import { store } from "$lib/state/store.svelte.ts";
import DossiersFilterModal from "./DossiersFilterModal.svelte";
import { defaultDossiersQuery, type DossiersQuery } from "./listModel.ts";

const aigle: EspeceProtegee = {
  CD_REF: "2938",
  nomsVernaculaires: new Set(["Aigle royal"]),
  nomsScientifiques: new Set(["Aquila chrysaetos"]),
  classification: "oiseau",
  CD_TYPE_STATUTS: new Set(["PN"]),
  espèceMinistérielle: undefined,
  espèceCNPN: undefined,
};

function renderModal() {
  const draft: DossiersQuery = $state(defaultDossiersQuery());
  render(DossiersFilterModal, {
    open: true,
    draft,
    dossiers: [],
    showFilterInstructeurice: false,
    numberResults: 12,
    onApply: () => {},
    onClose: () => {},
  });
  return { draft };
}

beforeEach(() => {
  store.espèceByCD_REF = new Map([[aigle.CD_REF, aigle]]);
});

afterEach(cleanup);

test("le tiroir ouvre le sous-panneau espèces et revient aux filtres", async () => {
  renderModal();

  await expect.element(page.getByRole("heading", { name: "Tous les filtres" })).toBeVisible();
  const trigger = page.getByRole("button", {
    name: "Recherchez une ou plusieurs espèces protégées…",
  });
  await expect.element(trigger).toBeVisible();

  await trigger.click();

  // The espece view has its own footer: it confirms the selection, it does not run the search
  await expect.element(page.getByRole("heading", { name: /Espèces impactées/ })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Valider les résultats" })).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Voir 12 résultats" }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole("button", { name: "Tout effacer" })).not.toBeInTheDocument();

  await page.getByRole("button", { name: "Revenir à tous les filtres" }).click();

  await expect.element(page.getByRole("heading", { name: "Tous les filtres" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Voir 12 résultats" })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Tout effacer" })).toBeVisible();
});

test("l'espèce cochée dans le sous-panneau se résume sur le déclencheur", async () => {
  const { draft } = renderModal();

  await page
    .getByRole("button", { name: "Recherchez une ou plusieurs espèces protégées…" })
    .click();
  await page.getByRole("checkbox", { name: /Aigle royal/ }).click();
  await page.getByRole("button", { name: "Revenir à tous les filtres" }).click();

  expect(draft.espece).toEqual(["2938"]);
  await expect
    .element(page.getByRole("button", { name: "Aigle royal (Aquila chrysaetos)" }))
    .toBeVisible();
});

test("« Valider les résultats » ramène aux filtres sans lancer la recherche", async () => {
  let applied = 0;
  const draft: DossiersQuery = $state(defaultDossiersQuery());
  render(DossiersFilterModal, {
    open: true,
    draft,
    dossiers: [],
    showFilterInstructeurice: false,
    numberResults: 12,
    onApply: () => (applied += 1),
    onClose: () => {},
  });

  await page
    .getByRole("button", { name: "Recherchez une ou plusieurs espèces protégées…" })
    .click();
  await page.getByRole("checkbox", { name: /Aigle royal/ }).click();
  await page.getByRole("button", { name: "Valider les résultats" }).click();

  // Same effect as the header chevron: back to the filters, the selection kept, nothing applied
  await expect.element(page.getByRole("heading", { name: "Tous les filtres" })).toBeVisible();
  expect(draft.espece).toEqual(["2938"]);
  expect(applied).toBe(0);

  await page.getByRole("button", { name: "Voir 12 résultats" }).click();
  await expect.poll(() => applied).toBe(1);
});
