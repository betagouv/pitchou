import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import type { OnagreImportPreview, OnagreImportRun } from "@pitchou/types/onagreImport.ts";
import ImportWorkspace from "./ImportWorkspace.svelte";

const snapshot = {
  id: 1,
  filename: "onagre-test.json",
  fingerprint: "snapshot-hash",
  created_at: new Date("2026-10-25"),
  tables: [],
  records_complete: true,
};
const data = { selected: snapshot, snapshots: [snapshot], importEnabled: true, importRuns: [] };
function makePreview(): OnagreImportPreview {
  return {
    previewId: "test-preview",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    sourceInstance: "onagre-test",
    snapshotId: 1,
    snapshotFingerprint: "snapshot-hash",
    mappingHash: "mapping-hash",
    inputHash: "input-hash",
    targetHash: "target-hash",
    policy: {
      version: "1",
      title: "Premier import",
      description: "Reprise de l'identité et de la réception.",
      omissions: ["Pièces jointes non reprises"],
    },
    availability: { enabled: true, reason: null },
    records: (["ready", "blocked", "already_imported", "conflict"] as const).map(
      (status, index) => ({
        recordId: String(index + 1),
        code: `CODE-${index}`,
        name: `Projet ${index}`,
        receptionDate: "2020-01-02",
        status,
        issues: status === "blocked" ? ["Date de réception manquante"] : [],
        omissions: [],
        sourceHash: "source-hash",
        targetHash: "target-hash",
        dossierId: status === "already_imported" ? 80 : null,
      }),
    ),
  };
}
const fillSelection = async () => {
  await page
    .getByRole("textbox", { name: "Identifiants internes des demandes Onagre" })
    .fill("1, 2, 3, 4");
  await page.getByRole("button", { name: "Calculer l'aperçu" }).click();
};
const importButton = () =>
  page.getByRole("button", { name: /Importer les demandes sélectionnées/u });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("previews all statuses and imports only an explicitly checked eligible demande", async () => {
  const preview = makePreview();
  const run: OnagreImportRun = {
    runId: "test-run",
    createdAt: new Date().toISOString(),
    actorId: 1,
    preview,
    recordIds: ["1"],
    outcomes: [{ recordId: "1", status: "created", dossierId: 90, issues: [], omissions: [] }],
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json(preview))
    .mockResolvedValueOnce(Response.json(run));
  vi.stubGlobal("fetch", fetchMock);
  render(ImportWorkspace, { data, writable: true });
  await fillSelection();
  await expect.element(page.getByText("Prête à importer", { exact: true })).toBeVisible();
  await expect.element(page.getByText("Bloquée", { exact: true })).toBeVisible();
  await expect.element(page.getByText("Déjà importée, inchangée", { exact: true })).toBeVisible();
  await expect.element(page.getByText("Conflit", { exact: true })).toBeVisible();
  await expect.element(importButton()).toBeDisabled();
  expect(page.getByRole("checkbox").elements()).toHaveLength(1);
  await page.getByText("Champs non repris par cette version", { exact: true }).click();
  await expect
    .element(page.getByText("Pièces jointes non reprises", { exact: true }))
    .toBeVisible();
  await page.getByRole("checkbox", { name: "Importer la demande #1" }).click();
  await importButton().click();
  await expect
    .element(page.getByRole("link", { name: "Ouvrir le dossier Pitchou #90" }))
    .toHaveAttribute("href", "/dossiers/90");
  await expect
    .element(page.getByRole("link", { name: "Télécharger le rapport JSON" }))
    .toHaveAttribute("href", "/onagre/imports?runId=test-run");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    action: "preview",
    snapshotId: 1,
    recordIds: ["1", "2", "3", "4"],
  });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    action: "apply",
    previewId: "test-preview",
    recordIds: ["1"],
  });
});

test("changing the manual selection prevents applying a stale preview", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json(makePreview()));
  vi.stubGlobal("fetch", fetchMock);
  render(ImportWorkspace, { data, writable: true });
  await fillSelection();
  await page.getByRole("checkbox", { name: "Importer la demande #1" }).click();
  await page.getByRole("textbox", { name: "Identifiants internes des demandes Onagre" }).fill("2");
  await expect
    .element(page.getByText("La sélection a changé. Recalculez l'aperçu avant d'importer."))
    .toBeVisible();
  await expect.element(importButton()).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledOnce();
});

test.each([
  { enabled: false, writable: true },
  { enabled: true, writable: false },
])("allows read-only preview when execution is unavailable: %s", async ({ enabled, writable }) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(makePreview())));
  render(ImportWorkspace, { data: { ...data, importEnabled: enabled }, writable });
  await fillSelection();
  await expect
    .element(page.getByRole("checkbox", { name: "Importer la demande #1" }))
    .toBeDisabled();
  await expect.element(importButton()).toBeDisabled();
});

test("a lost import response requires another preview before retrying", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json(makePreview()))
    .mockRejectedValueOnce(new TypeError("Connexion interrompue"));
  vi.stubGlobal("fetch", fetchMock);
  render(ImportWorkspace, { data, writable: true });
  await fillSelection();
  await page.getByRole("checkbox", { name: "Importer la demande #1" }).click();
  await importButton().click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(
      "Connexion interrompue Recalculez un aperçu pour vérifier les dossiers avant toute nouvelle tentative.",
    );
  await expect.element(importButton()).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("expired previews cannot be applied", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ ...makePreview(), expiresAt: "2000-01-01T00:00:00Z" }));
  vi.stubGlobal("fetch", fetchMock);
  render(ImportWorkspace, { data, writable: true });
  await fillSelection();
  await page.getByRole("checkbox", { name: "Importer la demande #1" }).click();
  await importButton().click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Cet aperçu a expiré. Recalculez-le avant d'importer.");
  expect(fetchMock).toHaveBeenCalledOnce();
});

test("retained reports are available on a fresh page without another API call", async () => {
  const run: OnagreImportRun = {
    runId: "saved-run",
    createdAt: "2026-10-25T12:00:00Z",
    actorId: 1,
    preview: makePreview(),
    recordIds: ["1"],
    outcomes: [{ recordId: "1", status: "created", dossierId: 91, issues: [], omissions: [] }],
  };
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(ImportWorkspace, { data: { ...data, importRuns: [run] }, writable: false });
  const report = page.getByRole("button", { name: /Import du/u });
  await expect.element(report).toHaveAttribute("aria-expanded", "false");
  await report.click();
  await expect
    .element(page.getByRole("link", { name: "Ouvrir le dossier Pitchou #91" }))
    .toBeVisible();
  await report.click();
  await expect
    .element(page.getByRole("link", { name: "Ouvrir le dossier Pitchou #91" }))
    .not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});
