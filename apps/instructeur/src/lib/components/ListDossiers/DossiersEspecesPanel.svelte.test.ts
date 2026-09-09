import { expect, test, beforeEach, afterEach } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";

import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import { store } from "$lib/state/store.svelte.ts";
import DossiersEspecesPanel from "./DossiersEspecesPanel.svelte";
import { defaultDossiersQuery, type DossiersQuery } from "./listModel.ts";

function makeEspece(
  CD_REF: string,
  nomVernaculaire: string,
  nomScientifique: string,
  classification: EspeceProtegee["classification"] = "oiseau",
): EspeceProtegee {
  return {
    CD_REF,
    nomsVernaculaires: new Set([nomVernaculaire]),
    nomsScientifiques: new Set([nomScientifique]),
    classification,
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceMinistérielle: undefined,
    espèceCNPN: undefined,
  };
}

const especes = [
  makeEspece("2938", "Aigle royal", "Aquila chrysaetos"),
  makeEspece("3571", "Martin-pêcheur d'Europe", "Alcedo atthis"),
  makeEspece("94207", "Cyclamen de Naples", "Cyclamen hederifolium", "flore"),
];

/** TAXREF leaves NOM_VERN empty for a good share of the especes, flore especially */
const sansNomVernaculaire: EspeceProtegee = {
  ...makeEspece("100", "", "Salamandra salamandra salamandra", "faune non-oiseau"),
  nomsVernaculaires: new Set(),
};

/**
 * Renders the panel over a draft the test reads back after each interaction. The draft is `$state`
 * so the panel sees its own writes, as it does under `ListDossiers`.
 */
function renderPanel(espece: string[] = []) {
  const draft: DossiersQuery = $state({ ...defaultDossiersQuery(), espece });
  const { container } = render(DossiersEspecesPanel, { draft });
  return { draft, container };
}

beforeEach(() => {
  store.espèceByCD_REF = new Map(especes.map((espece) => [espece.CD_REF, espece]));
});

afterEach(cleanup);

test("liste toutes les espèces du référentiel avec leur compteur", async () => {
  const { container } = renderPanel();

  expect(container.textContent).toContain("3 espèces");
  expect(container.textContent).toContain("Aigle royal");
  expect(container.textContent).toContain("Cyclamen de Naples");
});

test("filtre la liste sur le nom scientifique ou vernaculaire", async () => {
  const { container } = renderPanel();

  await page.getByRole("searchbox").fill("alcedo");

  await expect.poll(() => container.textContent).toContain("Martin-pêcheur d'Europe");
  expect(container.textContent).toContain("1 espèce");
  expect(container.textContent).not.toContain("Aigle royal");
});

test("cocher une espèce l'ajoute au brouillon de filtre", async () => {
  const { draft, container } = renderPanel();

  await page.getByRole("checkbox", { name: /Aigle royal/ }).click();

  await expect.poll(() => draft.espece).toEqual(["2938"]);
  // The selected espece is pinned above the results so it survives a new search
  expect(container.textContent).toContain("1 espèce sélectionnée");
});

test("« Tout désélectionner » vide la sélection", async () => {
  const { draft, container } = renderPanel(["2938", "3571"]);

  expect(container.textContent).toContain("2 espèces sélectionnées");
  await page.getByRole("button", { name: "Tout désélectionner" }).click();

  await expect.poll(() => draft.espece).toEqual([]);
});

test("affiche un message quand aucune espèce ne correspond", async () => {
  const { container } = renderPanel();

  await page.getByRole("searchbox").fill("zzzz");

  await expect
    .poll(() => container.textContent)
    .toContain("Aucune espèce protégée ne correspond à cette recherche.");
});

test("attend le référentiel avant de proposer des espèces", async () => {
  store.espèceByCD_REF = undefined;
  const { container } = renderPanel();

  expect(container.textContent).toContain("Chargement des espèces protégées…");
});

test("affiche le nom scientifique seul quand l'espèce n'a pas de nom vernaculaire", async () => {
  store.espèceByCD_REF = new Map([[sansNomVernaculaire.CD_REF, sansNomVernaculaire]]);
  const { container } = renderPanel();

  expect(container.textContent).toContain("Salamandra salamandra salamandra");
  expect(container.textContent).not.toContain("(Salamandra");
});

test("les filtres du panneau restreignent la liste par type, statut et instance", async () => {
  const oiseauCNPN = { ...makeEspece("2938", "Aigle royal", "Aquila chrysaetos"), espèceCNPN: "O" };
  store.espèceByCD_REF = new Map([
    [oiseauCNPN.CD_REF, oiseauCNPN as EspeceProtegee],
    ["94207", makeEspece("94207", "Cyclamen de Naples", "Cyclamen hederifolium", "flore")],
  ]);
  const { container } = renderPanel();

  await page.getByRole("button", { name: /Filtres/ }).click();

  // Type d'espèce : des bascules, pas des cases à cocher
  await page.getByRole("button", { name: /Flore/ }).click();
  await expect.poll(() => container.textContent).toContain("1 espèce");
  expect(container.textContent).toContain("Cyclamen de Naples");
  expect(container.textContent).not.toContain("Aigle royal");

  // Désélectionner rend la bascule inactive et rouvre la liste
  await page.getByRole("button", { name: /Flore/ }).click();
  await expect.poll(() => container.textContent).toContain("2 espèces");

  await page
    .getByRole("checkbox", { name: "CNPN (Conseil national du patrimoine naturel)" })
    .click();
  await expect.poll(() => container.textContent).toContain("Aigle royal");
  expect(container.textContent).not.toContain("Cyclamen de Naples");
});

test("le bouton Filtres affiche le nombre de valeurs sélectionnées", async () => {
  renderPanel();

  await page.getByRole("button", { name: /Filtres/ }).click();
  await page.getByRole("checkbox", { name: "PN (protection nationale)" }).click();
  await page.getByRole("button", { name: /Oiseau/ }).click();

  await expect.element(page.getByLabelText("2 filtre(s) actif(s)")).toBeVisible();
});
