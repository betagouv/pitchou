import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import { tick } from "svelte";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import { detailDossier, fieldChange } from "./detail.fixture.ts";
import { groupChange } from "./impactGroups.fixture.ts";
import { store } from "$lib/state/store.svelte.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

vi.mock("../readOnly.ts", () => ({ readOnlyMode: () => ({ current: false }) }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
afterEach(async () => {
  cleanup();
  store.notificationByDossier.clear();
  store.capabilities = {};
  await page.viewport(1280, 720);
});

test.each([1440, 1024, 390])(
  "all five sections keep the same review gutter at %ipx",
  async (width) => {
    await page.viewport(width, 900);
    const text = "Un texte long décrivant le projet et ses modalités. ".repeat(20);
    const changes = [
      fieldChange("Description", "description"),
      fieldChange("demandeur.email", "deposant_email"),
      fieldChange("Cartographie du projet", "projet_map"),
      groupChange("P-1"),
      fieldChange("piece:test"),
    ];
    const dossier = detailDossier(changes, {
      description: text,
      no_other_satisfactory_solution_justification: text,
      scientifique_demande_type: ["recherche"],
      scientifique_suivi_protocol_description: text,
      deposant_email: `${"adresse".repeat(20)}@example.org`,
      piecesJointesPetitionnaires: [
        {
          id: "test",
          name: `${text}.pdf`,
          url: "/test.pdf",
          media_type: "application/pdf",
          size: 1024,
          demarche_numerique_created_at: new Date("2026-08-31"),
        },
      ] as DossierFull["piecesJointesPetitionnaires"],
    });
    store.capabilities = {
      updateNotificationForDossier: vi.fn().mockResolvedValue({
        ...dossier.notificationSnapshot,
        changes: changes.slice(1),
      }),
    };
    const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
    const headers = [...view.container.querySelectorAll<HTMLButtonElement>("h3 button")];
    expect(headers.map((button) => button.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      expect.stringMatching(/^Porteur de projet/),
      expect.stringMatching(/^Informations du projet/),
      expect.stringMatching(/^Cartographie du projet/),
      expect.stringMatching(/^Espèces impactées/),
      expect.stringMatching(/^Pièces jointes/),
    ]);
    for (const header of headers) header.click();
    await tick();
    await document.fonts.ready;
    const rows = [...view.container.querySelectorAll<HTMLElement>(".dossier-review-row")];
    const first = rows[0].firstElementChild!.getBoundingClientRect();
    for (const row of rows) {
      const bounds = row.getBoundingClientRect();
      const left = row.firstElementChild!.getBoundingClientRect();
      expect(left.width).toBeCloseTo(first.width, 1);
      expect(bounds.width - left.width).toBeCloseTo(width > 768 ? 272 : 0, 1);
      const control = row.querySelector(".field-change")?.getBoundingClientRect();
      if (control) {
        if (width > 768) expect(control.left).toBeGreaterThan(left.right);
        else expect(control.top).toBeGreaterThanOrEqual(left.bottom);
      }
    }
    for (const element of view.container.querySelectorAll<HTMLElement>(".dossier-review-left")) {
      expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(first.width);
    }
    for (const header of headers) {
      expect(header.getBoundingClientRect().width).toBeGreaterThan(first.width);
      expect(getComputedStyle(header.closest("section")!).overflow).toBe("visible");
    }
    const map = view.container.querySelector(
      "#accordion-cartographie-projet .field-value > div:last-child",
    )!;
    expect(map.getBoundingClientRect().width).toBeCloseTo(first.width - 32, 1);
    expect(map.getBoundingClientRect().height).toBe(480);
    expect(view.container.querySelectorAll(".dossier-review-row .dossier-review-row")).toHaveLength(
      0,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);

    const description = view
      .getByRole("button", { name: "Valider la modification : Description" })
      .closest(".project-field")!
      .querySelector(".field-value")!;
    const before = description.getBoundingClientRect().width;
    view.getByRole("button", { name: "Valider la modification : Description" }).click();
    await vi.waitFor(() => expect(description).not.toHaveClass("pending"));
    expect(description.getBoundingClientRect().width).toBe(before);
    expect(description.getBoundingClientRect().width).toBe(first.width);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);

    await view.rerender({
      dossier: detailDossier([], {
        projet_map: null,
        especesImpactees: { impacts: [], sourceFile: undefined },
      }),
      anomalies: undefined,
    });
    await tick();
    for (const selector of [
      "#accordion-pieces-jointes-formulaire p",
      "#accordion-especes-impactees p",
      "#accordion-cartographie-projet .field-value",
      "#accordion-informations-projet > p",
      "#accordion-informations-projet > .dossier-review-left:last-child",
    ])
      expect(view.container.querySelector(selector)!.getBoundingClientRect().width).toBe(
        first.width,
      );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  },
);
