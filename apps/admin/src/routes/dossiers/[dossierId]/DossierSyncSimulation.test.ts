import { render } from "svelte/server";
import { expect, test } from "vitest";

import DossierSyncSimulation from "./DossierSyncSimulation.svelte";

const champs = [
  { column: "name", label: "Nom du projet" },
  { column: "description", label: "Description" },
];

function renderPanel(simulable: boolean): string {
  return render(DossierSyncSimulation, {
    props: { dossierId: 1, champs, simulable },
  }).body;
}

test("le panneau propose les champs simulables d'un dossier venu de DN", () => {
  const html = renderPanel(true);
  expect(html).toContain("Simuler une modification du pétitionnaire");
  // The champ list lives in a listbox opened on click, so only the current
  // choice shows up in the server-rendered markup.
  expect(html).toContain('id="simulation-champ"');
  expect(html).toContain("Nom du projet");
  expect(html).toContain("Simuler la synchronisation");
});

test("un dossier hors DN explique pourquoi la simulation ne s'applique pas", () => {
  const html = renderPanel(false);
  expect(html).toContain("ne vient pas de Démarches Numériques");
  expect(html).not.toContain("Simuler la synchronisation");
});
