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
  expect(html).not.toContain("Simuler une modification d'espèces");
});

test("species groups can be selected independently of scalar fields", () => {
  const html = render(DossierSyncSimulation, {
    props: {
      dossierId: 1,
      champs,
      simulable: true,
      speciesGroups: [{ id: "P-4-2", label: "Destruction d'habitat" }],
    },
  }).body;
  expect(html).toContain('aria-labelledby="dossier-simulation-title"');
  expect(html).toContain('id="dossier-simulation-title"');
  expect(html).toContain("border-[color:var(--border-default-grey)]");
  expect(html).toContain("bg-[var(--background-alt-grey)]");
  expect(html).not.toContain("fr-fieldset__element");
  expect(html).toContain("Groupe d'impact à modifier");
  expect(html).toContain("Destruction d'habitat (P-4-2)");
  expect(html).toContain("Simuler une modification d'espèces");
  expect(html).toContain("Le fichier original reste inchangé");
});

test("empty species dossiers explain why the simulation is unavailable", () => {
  const html = renderPanel(true);
  expect(html).toContain("Aucune espèce importée dans ce dossier");
  expect(html).not.toContain("Groupe d'impact à modifier");
  expect(html).not.toContain("Simuler une modification d'espèces");
});
