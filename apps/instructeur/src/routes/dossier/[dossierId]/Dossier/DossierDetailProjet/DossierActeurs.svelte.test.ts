import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import DossierActeurs from "./DossierActeurs.svelte";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FieldChange } from "@pitchou/types/notification.ts";

vi.mock("$app/env/public", () => ({}));
afterEach(cleanup);

const change = (field: string, label: string): [string, FieldChange] => [
  field,
  {
    field,
    label,
    revisions: [field as ActionDossierId],
    detected_at: new Date("2026-09-01T12:00:00Z"),
    modified_at: null,
  },
];

test("each acteur is a block with its details, a change under two involvements has two checks", () => {
  const view = render(DossierActeurs, {
    dossierId: 1 as DossierId,
    acteurs: [
      {
        involvements: ["beneficiaire_demarche_numerique", "deposant"],
        first_names: "Camille",
        last_name: "Martin",
        email: "camille@test.fr",
        address: null,
        phone: "0612345678",
        role: null,
      },
    ],
    modifiedFields: new Map([
      change("deposant.last_name", "Déposant : Nom"),
      change("beneficiaire_demarche_numerique.last_name", "Bénéficiaire Démarche Numérique : Nom"),
    ]),
  });
  const block = view.container.querySelector(
    '[aria-label="Déposant · Bénéficiaire Démarche Numérique"]',
  )!;
  expect(block.querySelector('a[href="mailto:camille@test.fr"]')).not.toBeNull();
  expect(block.querySelector('a[href="tel:0612345678"]')).not.toBeNull();
  expect(block.querySelector(".pending")?.textContent).toContain("Martin");
  expect(
    [...block.querySelectorAll("button[aria-label]")].map((button) =>
      button.getAttribute("aria-label"),
    ),
  ).toEqual([
    "Valider la modification : Déposant : Nom",
    "Valider la modification : Bénéficiaire Démarche Numérique : Nom",
  ]);
});
