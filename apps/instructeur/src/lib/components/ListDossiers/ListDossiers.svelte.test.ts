import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/mes-dossiers") }) };
});
vi.mock("$lib/shared/aarri.ts", () => ({
  sendDossierSearchEvent: vi.fn(),
  sendEvenement: vi.fn(),
}));

import { goto } from "$app/navigation";
import { page as route } from "$app/state";
import { store } from "$lib/state/store.svelte.ts";
import DossiersSortMenu from "./DossiersSortMenu.svelte";
import DossierActionsMenu from "../DossierFollowerAssignment/DossierActionsMenu.svelte";
import MesDossiers from "../../../routes/mes-dossiers/MesDossiers.svelte";
import { dossierId, makeDossier } from "./testHelpers.ts";

// The route mock accepts any URL, unlike SvelteKit's generated route-specific type.
const routeState: { url: URL } = route;

beforeEach(() => {
  routeState.url = new URL("http://localhost/mes-dossiers");
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  store.notificationByDossier.clear();
  store.dossierSummaries.clear();
  store.capabilities = {};
});

test("deadline sort labels select the corresponding direction without changing the default", async () => {
  const onSort = vi.fn();
  render(DossiersSortMenu, { sortKey: "depositDate", sortOrder: "desc", onSort });
  await page.getByRole("button", { name: "Tri : Date de dépôt : les plus récentes" }).click();
  await page.getByRole("menuitemradio", { name: /^Date d’échéance : les plus urgentes$/ }).click();
  expect(onSort).toHaveBeenLastCalledWith("nextDueDate", "asc");
  await page.getByRole("button", { name: /Tri :/ }).click();
  await page.getByRole("menuitemradio", { name: /^Date d’échéance : les moins urgentes$/ }).click();
  expect(onSort).toHaveBeenLastCalledWith("nextDueDate", "desc");
});

test("My dossiers toggles the existing unread query and resets pagination", async () => {
  routeState.url = new URL("http://localhost/mes-dossiers?page=3&sort=nextDueDate&order=asc");
  render(MesDossiers, { dossiers: [], notificationByDossier: store.notificationByDossier });
  await fireEvent.click(screen.getByRole("button", { name: /^Modifications non lues$/ }));
  const url = new URL(vi.mocked(goto).mock.lastCall![0].toString(), "http://localhost");
  expect(url.searchParams.get("nouveaute")).toBe("oui");
  expect(url.searchParams.get("page")).toBeNull();
  expect(url.searchParams.get("sort")).toBe("nextDueDate");
  expect(url.searchParams.get("order")).toBe("asc");

  routeState.url = url;
  await tick();
  expect(
    screen.getByRole("button", { name: /^Modifications non lues$/ }).getAttribute("aria-pressed"),
  ).toBe("true");
  await fireEvent.click(screen.getByRole("button", { name: /^Modifications non lues$/ }));
  expect(
    new URL(vi.mocked(goto).mock.lastCall![0].toString(), "http://localhost").searchParams.has(
      "nouveaute",
    ),
  ).toBe(false);
});

test("shared menu can hide deadlines while retaining read-only viewing extras and a 24px horizontal trigger", async () => {
  const viewReadOnly = vi.fn();
  render(DossierActionsMenu, {
    dossierId: dossierId(1),
    dossierName: "Restauration des marais",
    showDeadline: false,
    extraItems: [{ label: "Voir le dossier en lecture seule", onClick: viewReadOnly }],
  });
  const trigger = screen.getByRole("button", { name: /Plus d’actions/ });
  expect(getComputedStyle(trigger).width).toBe("24px");
  expect(getComputedStyle(trigger).height).toBe("24px");
  expect(
    [...trigger.querySelectorAll("circle")].map((circle) => circle.getAttribute("cy")),
  ).toEqual(["12", "12", "12"]);
  await page.getByRole("button", { name: /Plus d’actions/ }).click();
  expect(screen.queryByRole("menuitem", { name: /Modifier la date/ })).toBeNull();
  expect(screen.queryByRole("menuitem", { name: /Partager/ })).toBeNull();
  expect(screen.getByRole("menuitem", { name: "Faire suivre le dossier" })).toBeTruthy();
  await page.getByRole("menuitem", { name: "Voir le dossier en lecture seule" }).click();
  expect(viewReadOnly).toHaveBeenCalledOnce();
});

test.each(["15/10/2026", ""])(
  "deadline editor survives optimistic regrouping to '%s' and a failed save",
  async (draft) => {
    routeState.url = new URL("http://localhost/mes-dossiers?sort=nextDueDate&order=asc");
    const dossier = makeDossier({ next_due_date: new Date("2026-09-15T00:00:00") });
    store.dossierSummaries.set(dossier.id, dossier);
    const response = Promise.withResolvers<void>();
    store.capabilities.modifierDossier = vi.fn(() => response.promise);
    render(MesDossiers, {
      get dossiers() {
        return [...store.dossierSummaries.values()];
      },
      notificationByDossier: store.notificationByDossier,
    });
    const trigger = screen.getByRole("button", { name: /Plus d’actions/ });
    await fireEvent.click(trigger);
    await fireEvent.click(screen.getByRole("menuitem", { name: /Modifier la date/ }));
    const dialog = screen.getByRole("dialog", { name: /Modifier la date/ });
    const input = screen.getByRole("textbox", { name: "Date de la prochaine échéance" });
    await fireEvent.input(input, { target: { value: draft } });
    await fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(store.capabilities.modifierDossier).toHaveBeenCalledOnce();
    expect(trigger.isConnected).toBe(false);
    expect(dialog).toBeVisible();
    expect(screen.getByRole("dialog", { name: /Modifier la date/ })).toBe(dialog);
    expect(screen.getByRole("button", { name: "Enregistrement…" })).toBeDisabled();
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fermer" })).toBeDisabled();
    await fireEvent.click(screen.getByRole("button", { name: "Enregistrement…" }));
    expect(store.capabilities.modifierDossier).toHaveBeenCalledOnce();
    expect(await fireEvent(dialog, new Event("cancel", { cancelable: true }))).toBe(false);

    response.reject(new Error("Save failed"));
    await screen.findByText("La modification de la date d’échéance a échoué. Veuillez réessayer.");
    expect(screen.getByRole("dialog", { name: /Modifier la date/ })).toBe(dialog);
    expect(input).toHaveValue(draft);
    expect(input).not.toBeDisabled();
    expect(store.dossierSummaries.get(dossier.id)?.next_due_date).toEqual(dossier.next_due_date);

    const retry = Promise.withResolvers<void>();
    store.capabilities.modifierDossier = vi.fn(() => retry.promise);
    await fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(dialog).toBeVisible();
    retry.resolve();
    await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Plus d’actions/ })).toHaveFocus();
    expect(store.dossierSummaries.get(dossier.id)?.next_due_date).toEqual(
      draft ? new Date("2026-10-15T00:00:00") : null,
    );
  },
);
