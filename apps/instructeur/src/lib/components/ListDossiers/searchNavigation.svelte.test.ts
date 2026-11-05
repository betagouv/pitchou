import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/tous-les-dossiers") }) };
});
vi.mock("#lib/shared/aarri.ts", () => ({
  sendEvenement: vi.fn(),
  sendDossierSearchEvent: vi.fn(),
}));
import { page as route } from "$app/state";
import { goto } from "$app/navigation";
import { store } from "#lib/state/store.svelte.ts";
import { sendDossierSearchEvent } from "#lib/shared/aarri.ts";
import ListDossiers from "./ListDossiers.svelte";
import { dossierId, makeDossier } from "./testHelpers.ts";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("only the latest search announces its own result count when navigations overlap", async () => {
  const routeState: Pick<typeof route, "url"> = route;
  routeState.url = new URL("http://localhost/tous-les-dossiers");
  const first = Promise.withResolvers<void>();
  const second = Promise.withResolvers<void>();
  vi.mocked(goto)
    .mockImplementationOnce((url) => {
      routeState.url = new URL(String(url), "http://localhost/tous-les-dossiers");
      return first.promise;
    })
    .mockImplementationOnce((url) => {
      routeState.url = new URL(String(url), "http://localhost/tous-les-dossiers");
      return second.promise;
    });
  render(ListDossiers, {
    title: "Tous les dossiers",
    dossiers: [
      makeDossier({ id: dossierId(1), name: "Marais" }),
      makeDossier({ id: dossierId(2), name: "Prairie" }),
    ],
    notificationByDossier: store.notificationByDossier,
  });
  const input = screen.getByRole("searchbox");
  await fireEvent.input(input, { target: { value: "Marais" } });
  await fireEvent.input(input, { target: { value: "Prairie" } });
  second.resolve();
  await tick();
  await expect.poll(() => vi.mocked(sendDossierSearchEvent).mock.calls.length).toBe(1);
  expect(sendDossierSearchEvent).toHaveBeenLastCalledWith(
    expect.objectContaining({
      filters: expect.objectContaining({ text: "Prairie" }),
      resultCount: 1,
    }),
  );
  first.resolve();
  await tick();
  expect(sendDossierSearchEvent).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("card-dossier").textContent).toContain("Prairie");
});
