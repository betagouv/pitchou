import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/mes-dossiers") }) };
});
vi.mock("#lib/shared/aarri.ts", () => ({
  sendDossierSearchEvent: vi.fn(),
  sendEvenement: vi.fn(),
}));

import { goto } from "$app/navigation";
import { page } from "$app/state";
import MesDossiers from "../../../routes/mes-dossiers/MesDossiers.svelte";
import TousLesDossiers from "../../../routes/tous-les-dossiers/TousLesDossiers.svelte";

const route: Pick<typeof page, "url"> = page;
const email = "remember-filters@example.fr";
const props = { email, dossiers: [], notificationByDossier: new Map() };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(goto).mockImplementation(async (url) => {
    route.url = new URL(url.toString(), route.url.href);
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

test("each list restores its own query after remounting and returning through a bare URL", async () => {
  route.url = new URL("http://localhost/mes-dossiers?nouveaute=oui&q=marais&pageSize=25&page=2");
  render(MesDossiers, props);
  await tick();
  cleanup();
  route.url = new URL(
    "http://localhost/tous-les-dossiers?enjeu=1&localisation=france&departement=75",
  );
  render(TousLesDossiers, props);
  await tick();
  cleanup();

  for (const path of ["mes-dossiers", "tous-les-dossiers"]) {
    route.url = new URL(`http://localhost/${path}?campaign=header#results`);
    render(path === "mes-dossiers" ? MesDossiers : TousLesDossiers, props);
    await tick();
    expect(route.url.searchParams.get("campaign")).toBe("header");
    expect(route.url.hash).toBe("#results");
    if (path === "mes-dossiers") {
      expect(route.url.searchParams.get("q")).toBe("marais");
      expect(route.url.searchParams.get("nouveaute")).toBe("oui");
      expect(route.url.searchParams.get("pageSize")).toBe("25");
      expect(route.url.searchParams.get("page")).toBe("2");
      expect(route.url.searchParams.has("enjeu")).toBe(false);
    } else {
      expect(route.url.searchParams.get("enjeu")).toBe("1");
      expect(route.url.searchParams.get("localisation")).toBe("france");
      expect(route.url.searchParams.getAll("departement")).toEqual(["75"]);
      expect(route.url.searchParams.has("nouveaute")).toBe(false);
    }
    cleanup();
  }
});

test("a filtered link replaces saved preferences without mixing filters", async () => {
  route.url = new URL("http://localhost/mes-dossiers?nouveaute=oui&q=marais");
  render(MesDossiers, props);
  await tick();
  route.url = new URL("http://localhost/mes-dossiers?actionInstructeur=1");
  await tick();
  cleanup();
  route.url = new URL("http://localhost/mes-dossiers");
  render(MesDossiers, props);
  await tick();
  expect(route.url.search).toBe("?actionInstructeur=1");
});

test("clearing the last filter stays cleared on the next visit", async () => {
  route.url = new URL("http://localhost/mes-dossiers?nouveaute=oui");
  render(MesDossiers, props);
  await tick();
  await fireEvent.click(screen.getByRole("button", { name: /^Modifications non lues$/u }));
  await tick();
  expect(route.url.search).toBe("");
  cleanup();
  render(MesDossiers, props);
  await tick();
  expect(route.url.search).toBe("");
});

test("accounts do not inherit each other's filters", async () => {
  route.url = new URL("http://localhost/mes-dossiers?nouveaute=oui");
  render(MesDossiers, props);
  await tick();
  cleanup();
  route.url = new URL("http://localhost/mes-dossiers");
  render(MesDossiers, { ...props, email: "another@example.fr" });
  await tick();
  expect(goto).not.toHaveBeenCalled();
});

test("clearing a saved filter stays cleared when storage becomes read-only", async () => {
  const key = `pitchou:dossiers-query:${encodeURIComponent(email)}:/mes-dossiers`;
  localStorage.setItem(key, "nouveaute=oui");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Full");
  });
  route.url = new URL("http://localhost/mes-dossiers");
  render(MesDossiers, props);
  await tick();
  expect(route.url.search).toBe("?nouveaute=oui");
  await fireEvent.click(screen.getByRole("button", { name: /^Modifications non lues$/u }));
  await tick();
  expect(localStorage.getItem(key)).toBe("nouveaute=oui");
  expect(route.url.search).toBe("");
  cleanup();
  render(MesDossiers, props);
  await tick();
  expect(route.url.search).toBe("");
});

test("unavailable storage leaves filtering usable", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Full");
  });
  route.url = new URL("http://localhost/mes-dossiers");
  render(MesDossiers, props);
  await tick();
  await fireEvent.click(screen.getByRole("button", { name: /^Modifications non lues$/u }));
  await tick();
  expect(route.url.searchParams.get("nouveaute")).toBe("oui");
});
