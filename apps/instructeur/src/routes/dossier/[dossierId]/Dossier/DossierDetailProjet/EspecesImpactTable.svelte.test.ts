import { page } from "vitest/browser";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../../../app.css";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import { habitat, impact, speciesDossier } from "./impactGroups.fixture.ts";

const mode = vi.hoisted(() => ({ current: false }));
vi.mock("../readOnly.ts", () => ({ readOnlyMode: () => mode }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
beforeEach(() => {
  mode.current = false;
});
afterEach(cleanup);

test("numeric columns share one width across tables and the species column takes the rest", async () => {
  await page.viewport(1440, 900);
  try {
    const view = render(DossierDetailProjet, {
      dossier: speciesDossier([
        impact(),
        habitat,
        impact({ methode: "Filets", moyenDePoursuite: "Avion", nids: 0 }),
      ]),
      anomalies: undefined,
    });
    view.getByRole("button", { name: /^Espèces impactées/ }).click();
    await tick();
    const widths = new Set<number>();
    for (const table of view.getAllByRole("table")) {
      const headers = [...table.querySelectorAll<HTMLElement>("thead th")];
      const narrow = headers.filter((th) => th.classList.contains("narrow"));
      expect(narrow.map((th) => th.textContent)).not.toContain("Méthode");
      for (const th of narrow) widths.add(Math.round(th.getBoundingClientRect().width));
      if (narrow.length === headers.length - 1) {
        const table_ = table.getBoundingClientRect().width;
        // Borders account for the one pixel of play.
        expect(headers[0].getBoundingClientRect().width).toBeCloseTo(
          table_ - narrow.length * 288,
          -1,
        );
      }
    }
    // "Nb d’individus" and "Surface habitat détruit (m²)" columns: one and the same width.
    expect([...widths]).toEqual([288]);
  } finally {
    await page.viewport(1280, 720);
  }
});
