import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import ImportPreview from "./ImportPreview.svelte";
import ImportRunResult from "./ImportRunResult.svelte";
import { makePreview } from "../importWorkspaceFixtures.ts";
import type { OnagreImportPlan } from "@pitchou/types/onagreImport.ts";

afterEach(cleanup);
const plan: OnagreImportPlan = {
  columns: { description: "Lieux des opérations, Onagre\n<b>Texte brut</b>" },
  fields: [
    {
      target: "dossier.description",
      value: "Lieux des opérations, Onagre\n<b>Texte brut</b>",
      sources: ["demandes.lieux"],
      mappings: [{ key: "field:demandes.lieux", version: 4 }],
    },
  ],
};

test("preview shows exact values and mapping provenance without interpreting source markup", async () => {
  const preview = makePreview();
  preview.records = [{ ...preview.records[0], plan }];
  render(ImportPreview, { preview, selected: [], disabled: false, onToggle: () => {} });
  await page.getByText("Valeurs prévues dans Pitchou · 1 champ complémentaire").click();
  await expect.element(page.getByText("<b>Texte brut</b>", { exact: false })).toBeVisible();
  expect(document.querySelector(".import-field-value b")).toBeNull();
  await expect.element(page.getByText("Source · demandes.lieux")).toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "field:demandes.lieux · version 4" }))
    .toHaveAttribute("href", "?tab=correspondances&mapping=field%3Ademandes.lieux");
  await expect
    .element(page.getByRole("checkbox", { name: "Importer la demande #1" }))
    .not.toBeChecked();
});

test("saved reports retain planned values after refresh", async () => {
  render(ImportRunResult, {
    run: {
      runId: "retained-mapped-run",
      createdAt: "2026-10-26T06:00:00Z",
      actorId: 1,
      preview: makePreview(),
      recordIds: ["1"],
      outcomes: [
        { recordId: "1", status: "created", dossierId: 92, issues: [], omissions: [], plan },
      ],
    },
  });
  await page.getByText("Valeurs prévues dans Pitchou · 1 champ complémentaire").click();
  await expect.element(page.getByText("Source · demandes.lieux")).toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "Ouvrir le dossier Pitchou #92" }))
    .toHaveAttribute("href", "/dossiers/92");
});
