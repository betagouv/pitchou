import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { page } from "vitest/browser";
import { fakeDossierFull } from "../../../fakeDossier.ts";
import DossierVersions from "./DossierVersions.svelte";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockVersions() {
  return vi.spyOn(window, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/demandes"))
      return Response.json({
        projet: { id: "project", name: "Projet commun" },
        access: "complet",
        demandes: [
          { id: 123, label: "Demande A", phase: "Instruction" },
          { id: 124, label: "Demande B", phase: "Contrôle" },
        ],
      });
    if (!url.includes("?"))
      return Response.json([
        { id: "2", recorded_at: "2026-11-03T12:00:00Z" },
        { id: "1", recorded_at: "2026-11-02T12:00:00Z" },
      ]);
    const old = url.endsWith("revision=1");
    return Response.json({
      revision: old ? { id: "1", recorded_at: "2026-11-02T12:00:00Z" } : null,
      dossier: fakeDossierFull({
        description: old ? "Description ancienne conservée" : "Description actuelle",
        departments: url.includes("/124/") ? ["71"] : ["21"],
      }),
      commentaires: [],
    });
  });
}

test("opens a frozen historical state and compares two independently selected demandes", async () => {
  const requests = mockVersions();
  render(DossierVersions, { dossierId: 123 });
  await page.getByRole("button", { name: "Consulter et comparer les états" }).click();
  await expect.element(page.getByText("Description actuelle", { exact: true })).toBeVisible();
  await vi.waitFor(() =>
    expect(document.querySelectorAll("#version-left-state option")).toHaveLength(3),
  );
  await fireEvent.change(document.querySelector("#version-left-state")!, {
    target: { value: "1" },
  });
  await expect
    .element(page.getByText("Description ancienne conservée", { exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Modifier", exact: true }))
    .not.toBeInTheDocument();
  await page.getByRole("checkbox", { name: "Comparer deux états ou demandes" }).click();
  await expect.element(page.getByRole("table")).toBeVisible();
  await expect
    .element(page.getByRole("cell", { name: "Description actuelle", exact: true }))
    .toBeVisible();
  expect((screen.getAllByLabelText("Demande")[1] as HTMLSelectElement).value).toBe("124");
  expect(
    requests.mock.calls.every(([, options]) => !options?.method || options.method === "GET"),
  ).toBe(true);
});

test("shows an access error instead of stale historical data", async () => {
  vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 403 }));
  render(DossierVersions, { dossierId: 123 });
  await page.getByRole("button", { name: "Consulter et comparer les états" }).click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Impossible de charger les demandes ou leurs états historiques.");
  await expect.element(page.getByRole("table")).not.toBeInTheDocument();
});
