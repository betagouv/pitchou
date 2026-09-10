import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock(import("@odfjs/odfjs"), () => ({
  fillOdtTemplate: vi.fn(async (template: ArrayBuffer) => template),
  getOdtTextContent: vi.fn(async () => "Document complété"),
}));

vi.mock(import("$lib/especes/activitesMethodesMoyensDePoursuite.ts"), () => ({
  loadActivitesMethodesMoyensDePoursuite: vi.fn(async () => ({
    activités: { oiseau: new Map(), "faune non-oiseau": new Map(), flore: new Map() },
    méthodes: { oiseau: new Map(), "faune non-oiseau": new Map(), flore: new Map() },
    moyensDePoursuite: { oiseau: new Map(), "faune non-oiseau": new Map(), flore: new Map() },
    identifiantPitchouVersActivitéEtImpactsQuantifiés: new Map(),
  })),
}));

import { fillOdtTemplate } from "@odfjs/odfjs";
import { store } from "$lib/state/store.svelte.ts";
import DossierGenerationDocuments from "./DossierGenerationDocuments.svelte";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";

// Generated documents are recorded in the dossier historique, which is also where
// their usage metric comes from.
const enregistrerDocumentsGeneres = vi.fn(
  async (_dossierId: number, _documents: string[]) => undefined,
);

beforeEach(() => {
  vi.mocked(fillOdtTemplate).mockClear();
  enregistrerDocumentsGeneres.mockClear();
  store.capabilities = { enregistrerDocumentsGeneres } as unknown as PitchouState["capabilities"];
});

afterEach(cleanup);

async function chooseTemplates(container: HTMLElement, templates: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("Input de modèles introuvable");

  const dataTransfer = new DataTransfer();
  for (const template of templates) {
    dataTransfer.items.add(template);
  }
  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

test("génère un document téléchargeable pour chaque modèle sélectionné", async () => {
  const { container } = render(DossierGenerationDocuments, {
    dossier: {
      id: "dossier-1",
      name: "Dossier CNPN",
      especesImpactees: { sourceFile: undefined, impacts: [] },
    } as unknown as DossierFull,
  });
  const templates = [
    new File(["mail"], "mail-saisine-cnpn.odt", {
      type: "application/vnd.oasis.opendocument.text",
    }),
    new File(["saisine"], "saisine-cnpn.odt", {
      type: "application/vnd.oasis.opendocument.text",
    }),
  ];

  expect(container.querySelector<HTMLInputElement>('input[type="file"]')?.multiple).toBe(true);
  await chooseTemplates(container, templates);
  await page.getByRole("button", { name: "Générer le(s) document(s)" }).click();

  await waitFor(() => {
    expect(fillOdtTemplate).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll("a[download]")).toHaveLength(2);
  });

  const downloadNames = Array.from(
    container.querySelectorAll<HTMLAnchorElement>("a[download]"),
    (link) => link.download,
  );
  expect(downloadNames[0]).toMatch(/^mail-saisine-cnpn-\d{4}-\d{2}-\d{2}-\d{2}h\d{2}\.odt$/);
  expect(downloadNames[1]).toMatch(/^saisine-cnpn-\d{4}-\d{2}-\d{2}-\d{2}h\d{2}\.odt$/);
  await waitFor(() => {
    expect(enregistrerDocumentsGeneres).toHaveBeenCalledTimes(1);
  });
  expect(enregistrerDocumentsGeneres.mock.calls[0][1]).toEqual(downloadNames);
});

test("affiche les modèles sélectionnés et permet d'en retirer un", async () => {
  const { container } = render(DossierGenerationDocuments, {
    dossier: {
      id: "dossier-1",
      name: "Dossier CNPN",
      especesImpactees: { sourceFile: undefined, impacts: [] },
    } as unknown as DossierFull,
  });
  const templates = [
    new File(["mail"], "mail-saisine-cnpn.odt", {
      type: "application/vnd.oasis.opendocument.text",
    }),
    new File(["saisine"], "saisine-cnpn.odt", {
      type: "application/vnd.oasis.opendocument.text",
    }),
  ];

  await chooseTemplates(container, templates);

  await expect.element(page.getByText("2 modèles sélectionnés")).toBeVisible();
  await expect.element(page.getByText("mail-saisine-cnpn.odt", { exact: true })).toBeVisible();
  await expect.element(page.getByText("saisine-cnpn.odt", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Retirer mail-saisine-cnpn.odt" }).click();

  await expect.element(page.getByText("1 modèle sélectionné")).toBeVisible();
  await expect
    .element(page.getByText("mail-saisine-cnpn.odt", { exact: true }))
    .not.toBeInTheDocument();
  await page.getByRole("button", { name: "Générer le(s) document(s)" }).click();

  await waitFor(() => {
    expect(fillOdtTemplate).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll("a[download]")).toHaveLength(1);
  });
  expect(container.querySelector<HTMLAnchorElement>("a[download]")?.download).toMatch(
    /^saisine-cnpn-\d{4}-\d{2}-\d{2}-\d{2}h\d{2}\.odt$/,
  );
});
