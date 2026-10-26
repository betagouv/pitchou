import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import type { OnagreImportJob, OnagreImportJobPage } from "@pitchou/types/onagreImport.ts";
import ImportAll from "./ImportAll.svelte";

const snapshot = {
  id: 1,
  filename: "onagre.json",
  fingerprint: "hash",
  created_at: new Date(),
  tables: [],
  records_complete: true,
};
const data = { selected: snapshot, snapshots: [snapshot], importEnabled: true, importJobs: [] };
const makeJob = (status: OnagreImportJob["status"]): OnagreImportJob => ({
  id: "job-1",
  actorId: 1,
  snapshotId: 1,
  status,
  total: 102,
  analyzed: 102,
  processed: 0,
  counts: { ready: 100, blocked: 1, conflict: 1, already_imported: 0, created: 0, omitted: 0 },
  error: null,
  createdAt: "2026-10-25T12:00:00Z",
  updatedAt: "2026-10-25T12:00:00Z",
  policy: {
    version: "v1",
    title: "Expérimental",
    description: "Dossiers minimaux uniquement.",
    omissions: ["Pièces jointes non reprises"],
  },
});
function mockApi(initial: OnagreImportJob["status"]) {
  let job = makeJob(initial);
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      const body = JSON.parse(String(options.body));
      job = {
        ...job,
        status:
          body.action === "analyze"
            ? "analyzing"
            : body.action === "cancel"
              ? "cancelled"
              : "importing",
      };
      return Response.json(job);
    }
    if (!url.includes("?")) return Response.json([job]);
    const detail: OnagreImportJobPage = {
      job,
      page: 1,
      pages: 2,
      records:
        job.status === "completed"
          ? [
              {
                recordId: "100",
                status: "created",
                dossierId: 90,
                issues: [],
                omissions: [],
                name: "Projet de test",
                code: "TEST-100",
              },
            ]
          : [],
    };
    return Response.json(detail);
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    fetchMock,
    setStatus(status: OnagreImportJob["status"]) {
      job = { ...job, status };
    },
  };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("polling stops at review and resumes when an import is running", async () => {
  const interval = vi.spyOn(globalThis, "setInterval");
  const api = mockApi("review");
  render(ImportAll, { data: { ...data, importJobs: [makeJob("review")] }, writable: true });
  const apply = page.getByRole("button", { name: "Importer toutes les demandes prêtes · 100" });
  await expect.element(apply).toBeEnabled();
  const poll = interval.mock.calls.find((call) => call[1] === 3000)?.[0];
  expect(typeof poll).toBe("function");
  const requests = api.fetchMock.mock.calls.length;
  (poll as () => void)();
  expect(api.fetchMock).toHaveBeenCalledTimes(requests);
  await expect.element(apply).toBeEnabled();
  await apply.click();
  await expect.element(page.getByRole("button", { name: "Actualiser le suivi" })).toBeEnabled();
  api.setStatus("completed");
  (poll as () => void)();
  await expect.element(page.getByRole("heading", { name: "Import terminé" })).toBeVisible();
});

test("analyzes without IDs, waits for review, then explicitly imports all eligible records", async () => {
  const api = mockApi("analyzing");
  render(ImportAll, { data, writable: true });
  await page.getByRole("button", { name: "Analyser toutes les demandes" }).click();
  await expect.element(page.getByRole("heading", { name: "Analyse en cours" })).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: /Importer toutes les demandes prêtes/u }))
    .not.toBeInTheDocument();
  const firstPost = api.fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(String(firstPost?.[1]?.body))).toEqual({ action: "analyze", snapshotId: 1 });
  api.setStatus("review");
  await page.getByRole("button", { name: "Actualiser le suivi" }).click();
  await page.getByRole("button", { name: "Importer toutes les demandes prêtes · 100" }).click();
  await expect.element(page.getByRole("heading", { name: "Import en cours" })).toBeVisible();
  const posts = api.fetchMock.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(JSON.parse(String(posts[1][1]?.body))).toEqual({
    action: "import",
    snapshotId: 1,
    jobId: "job-1",
  });
  api.setStatus("completed");
  await page.getByRole("button", { name: "Actualiser le suivi" }).click();
  await expect
    .element(page.getByRole("link", { name: "Ouvrir le dossier #90" }))
    .toHaveAttribute("href", "/dossiers/90");
  await expect
    .element(page.getByRole("link", { name: "Télécharger le rapport complet" }))
    .toHaveAttribute("href", "/onagre/import-jobs?jobId=job-1&download=1");
});

test("restores a persisted operation on a fresh page and can stop it", async () => {
  const api = mockApi("importing");
  render(ImportAll, { data: { ...data, importJobs: [makeJob("importing")] }, writable: true });
  await expect.element(page.getByRole("heading", { name: "Import en cours" })).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Analyser toutes les demandes" }))
    .toBeDisabled();
  await page.getByRole("button", { name: "Arrêter cette opération" }).click();
  await expect.element(page.getByRole("heading", { name: "Opération arrêtée" })).toBeVisible();
  expect(api.fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(
    1,
  );
});

test.each([
  { writable: false, enabled: true },
  { writable: true, enabled: false },
])(
  "does not enable apply without permission and environment gates: %s",
  async ({ writable, enabled }) => {
    const api = mockApi("review");
    render(ImportAll, {
      data: { ...data, importEnabled: enabled, importJobs: [makeJob("review")] },
      writable,
    });
    await expect
      .element(page.getByRole("button", { name: "Importer toutes les demandes prêtes · 100" }))
      .toBeDisabled();
    expect(api.fetchMock.mock.calls.every(([, options]) => options?.method !== "POST")).toBe(true);
  },
);

test("a failed start shows an error without claiming the job was created", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Connexion interrompue")));
  render(ImportAll, { data, writable: true });
  await page.getByRole("button", { name: "Analyser toutes les demandes" }).click();
  await expect.element(page.getByRole("alert")).toHaveTextContent("Connexion interrompue");
  await expect
    .element(page.getByRole("heading", { name: "Analyse en cours" }))
    .not.toBeInTheDocument();
});
