import { afterEach, expect, test, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/svelte";
import { page } from "vitest/browser";
import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../app.css";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/tous-les-dossiers") }) };
});
vi.mock("$lib/shared/aarri.ts", () => ({
  sendDossierSearchEvent: vi.fn(),
  sendEvenement: vi.fn(),
}));

import { page as route } from "$app/state";
import { store } from "$lib/state/store.svelte.ts";
import ListDossiers from "./ListDossiers.svelte";
import { dossierId, makeDossier } from "./testHelpers.ts";

afterEach(() => {
  cleanup();
  store.capabilities = {};
  vi.restoreAllMocks();
});

test.each([false, true])(
  "export count and selection include all filtered pages, followed=%s",
  async (followedOnly) => {
    const exporterDossiers = vi.fn().mockResolvedValue(new Blob(["export"]));
    store.capabilities = { exporterDossiers };
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const routeState: { url: URL } = route;
    routeState.url = new URL(
      `http://localhost/${followedOnly ? "mes-dossiers" : "tous-les-dossiers"}?enjeu=1&page=2&pageSize=10`,
    );
    const dossiers = Array.from({ length: 25 }, (_, i) =>
      makeDossier({ id: dossierId(i + 1), enjeu: i < 22 }),
    );
    const followedIds = new Set(dossiers.slice(0, 21).map(({ id }) => id));
    render(ListDossiers, {
      title: followedOnly ? "Mes dossiers" : "Tous les dossiers",
      followedOnly,
      email: "test@example.fr",
      dossiers: followedOnly ? dossiers.filter(({ id }) => followedIds.has(id)) : dossiers,
      followRelations: new Map([["test@example.fr", followedIds]]),
      notificationByDossier: store.notificationByDossier,
    });
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(10);
    await page.getByRole("button", { name: "Exporter les dossiers", exact: true }).click();
    const count = followedOnly ? 21 : 22;
    await expect.element(page.getByText(`${count} dossiers`, { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole("dialog").getByText("À enjeu", { exact: true }))
      .toBeVisible();
    await page.getByRole("button", { name: "Télécharger l'export" }).click();
    expect(exporterDossiers).toHaveBeenCalledWith(
      followedOnly ? "followed" : "service",
      "ods",
      dossiers.slice(0, count).map(({ id }) => id),
    );
  },
);
