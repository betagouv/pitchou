import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import { detailDossier, fieldChange, projectMap } from "./detail.fixture.ts";
import { store } from "$lib/state/store.svelte.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";

const mode = vi.hoisted(() => ({ current: false }));
vi.mock("../readOnly.ts", () => ({ readOnlyMode: () => mode }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));
afterEach(() => {
  cleanup();
  mode.current = false;
  store.notificationByDossier.clear();
  store.capabilities = {};
  vi.restoreAllMocks();
});

test.each([null, { type: "FeatureCollection" as const, features: [] }, projectMap])(
  "maps, including removed maps, have their own badge and personal acknowledgment",
  async (projet_map) => {
    const change = fieldChange("Cartographie du projet", "projet_map");
    const dossier = detailDossier([change], { projet_map });
    store.capabilities = {
      updateNotificationForDossier: vi.fn().mockResolvedValue({
        ...dossier.notificationSnapshot,
        changes: [],
        viewed: true,
      }),
    };
    const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
    const map = view.getByRole("button", { name: /Cartographie du projet/ });
    expect(map.textContent).toContain("Nouvelles modifications");
    expect(view.getByRole("button", { name: /Informations du projet/ }).textContent).not.toContain(
      "Nouvelles modifications",
    );
    expect(view.getAllByText("Nouvelles modifications")).toHaveLength(1);
    expect(view.getByText("Nouvelles modifications").parentElement).toBe(map.lastElementChild);
    map.click();
    await tick();
    expect(view.queryByRole("heading", { level: 4, name: "Cartographie du projet" })).toBeNull();
    if (!projet_map?.features.length)
      expect(view.getByText("Aucune cartographie renseignée.")).toBeVisible();
    view.getByRole("button", { name: "Valider la modification : Cartographie du projet" }).click();
    await vi.waitFor(() => expect(view.queryByText("Nouvelles modifications")).toBeNull());
    expect(store.capabilities.updateNotificationForDossier).toHaveBeenCalledWith({
      dossier: dossier.id,
      revisions: change.revisions,
    });
    expect(view.container.querySelector(".pending, .field-change")).toBeNull();
    expect(map).toHaveAttribute("aria-expanded", "true");
    if (!projet_map?.features.length)
      expect(view.getByText("Aucune cartographie renseignée.")).toBeVisible();
  },
);

test("an empty map section is visible without any pending modification", async () => {
  const dossier = detailDossier([], { projet_map: null });
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  view.getByRole("button", { name: "Cartographie du projet" }).click();
  await tick();
  expect(view.getByText("Aucune cartographie renseignée.")).toBeVisible();
  expect(view.queryByRole("button", { name: /Télécharger/ })).toBeNull();
});

test("read-only map detail never reads personal notifications or displays review markers", async () => {
  const dossier = detailDossier([fieldChange("Cartographie du projet", "projet_map")]);
  mode.current = true;
  const get = vi.spyOn(store.notificationByDossier, "get");
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  view.getByRole("button", { name: "Cartographie du projet" }).click();
  await tick();
  expect(get).not.toHaveBeenCalled();
  expect(view.queryByText("Nouvelles modifications")).toBeNull();
  expect(view.container.querySelector(".pending, .field-change, .notification-dot")).toBeNull();
  expect(view.queryByRole("button", { name: /Valider la modification/ })).toBeNull();
  expect(view.getByRole("button", { name: /Télécharger la cartographie/ })).toBeVisible();
});

test("a newer map revision cannot be acknowledged from the previous snapshot", async () => {
  const change = fieldChange("Cartographie du projet", "projet_map");
  const dossier = detailDossier([change], { projet_map: null });
  store.notificationByDossier.set(dossier.id, {
    ...dossier.notificationSnapshot,
    changes: [{ ...change, revisions: ["new-map-revision" as ActionDossierId] }],
  });
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  view.getByRole("button", { name: "Cartographie du projet" }).click();
  await tick();
  expect(view.getByRole("button", { name: "Actualiser les modifications" })).toBeVisible();
  expect(view.queryByRole("button", { name: /Valider la modification/ })).toBeNull();
  expect(view.queryByText("Nouvelles modifications")).toBeNull();
});

test("map download keeps its GeoJSON content, filename and event", async () => {
  const dossier = detailDossier([]);
  const create = vi.spyOn(URL, "createObjectURL");
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  view.getByRole("button", { name: "Cartographie du projet" }).click();
  await tick();
  view.getByRole("button", { name: /Télécharger la cartographie/ }).click();
  await vi.waitFor(() => expect(click).toHaveBeenCalled());
  const blob = create.mock.calls[0][0] as Blob;
  expect(blob.type).toBe("application/geo+json");
  expect(JSON.parse(await blob.text())).toEqual(projectMap);
  expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe(
    `cartographie-${dossier.id}.geojson`,
  );
  expect(sendEvenement).toHaveBeenCalledWith({
    type: "téléchargerCartographieProjet",
    details: { dossierId: dossier.id },
  });
});

test("the map accordion mounts the interactive viewport and navigation controls", async () => {
  const dossier = detailDossier([]);
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  view.getByRole("button", { name: "Cartographie du projet" }).click();
  await vi.waitFor(() => expect(view.container.querySelector(".maplibregl-canvas")).not.toBeNull());
  expect(view.container.querySelector(".maplibregl-ctrl-zoom-in")).toBeVisible();
  expect(view.container.querySelector(".maplibregl-ctrl-zoom-out")).toBeVisible();
  expect(view.container.querySelector(".maplibregl-ctrl-compass")).toBeVisible();
  expect(view.getByText(/1 zone tracée/)).toBeVisible();
});
