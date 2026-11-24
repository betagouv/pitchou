import { afterEach, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import type { IndicatorsAARRI as Indicators } from "@pitchou/types/API_Pitchou.ts";
import IndicatorsAARRI from "./IndicatorsAARRI.svelte";

afterEach(cleanup);

function snapshot(date: string, acquired: number): Indicators {
  return {
    date,
    nombreBaseUtilisateuricePotentielle: 300,
    nombreUtilisateuriceAcquis: acquired,
    nombreUtilisateuriceActif: 10,
    nombreUtilisateuriceRetenu: 5,
    nombreUtilisateuriceImpact: 2,
    nombreUtilisateuriceProxyImpact: 3,
    nombreUtilisateuriceProxyRetenu: 4,
  };
}

test("loads the comparison with default dates and preserves an edited selection", async () => {
  const pending = Promise.withResolvers<Indicators[]>();
  const view = render(IndicatorsAARRI, { indicatorsByDateP: pending.promise });
  expect(view.container.querySelectorAll("svg")).toHaveLength(1);
  expect(view.queryByRole("combobox", { name: /^De$/u })).toBeNull();

  const indicators = [
    snapshot("2026-10-15", 30),
    snapshot("2026-10-08", 20),
    snapshot("2026-10-01", 10),
  ];
  pending.resolve(indicators);

  const start = page.getByRole("combobox", { name: "De", exact: true });
  const end = page.getByRole("combobox", { name: "à", exact: true });
  await expect.element(start).toMatchTextContent("1 octobre 2026");
  await expect.element(end).toMatchTextContent("15 octobre 2026");
  await expect
    .element(page.getByRole("row").filter({ hasText: "Acquis" }))
    .toMatchTextContent("200 %");

  await start.click();
  await page.getByRole("option", { name: "8 octobre 2026", exact: true }).click();
  await expect
    .element(page.getByRole("row").filter({ hasText: "Acquis" }))
    .toMatchTextContent("50 %");

  await view.rerender({ indicatorsByDateP: Promise.resolve([...indicators]) });
  await expect.element(start).toMatchTextContent("8 octobre 2026");
  await expect.element(end).toMatchTextContent("15 octobre 2026");
});

test("shows an error when the indicators cannot load", async () => {
  const pending = Promise.withResolvers<Indicators[]>();
  render(IndicatorsAARRI, { indicatorsByDateP: pending.promise });
  pending.reject(new Error("Request failed"));
  await expect
    .element(page.getByRole("alert"))
    .toMatchTextContent("Impossible de charger les indicateurs.");
});

test("shows both proxies in the summary, chart, comparison and methodology", async () => {
  const first = { ...snapshot("2026-10-01", 10), nombreUtilisateuriceProxyRetenu: 5 };
  const last = { ...snapshot("2026-10-08", 20), nombreUtilisateuriceProxyImpact: 4 };
  render(IndicatorsAARRI, { indicatorsByDateP: Promise.resolve([last, first]) });

  const summaryHeading = page.getByRole("heading", { name: "État des lieux" });
  await expect.element(summaryHeading).toBeVisible();
  const summary = summaryHeading.element().closest("section");
  expect(summary?.textContent).toMatch(/Proxy-impact\s*4/u);
  expect(summary?.textContent).toMatch(/Proxy-rétention\s*4/u);
  const chart = page.getByRole("img", { name: /par indicateur AARRI/u });
  const chartElement = chart.element();
  expect(chartElement.querySelectorAll("path[stroke-dasharray]")).toHaveLength(0);
  const markers = [...chartElement.querySelectorAll("circle:has(title)")];
  expect(markers.every((marker) => marker.getAttribute("r") === "3")).toBe(true);
  expect(markers.every((marker) => marker.getAttribute("fill") !== "none")).toBe(true);
  const pointLabels = markers.map((marker) => marker.querySelector("title")?.textContent);
  expect(pointLabels).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^Proxy-impact — .+ : 4$/u),
      expect.stringMatching(/^Proxy-rétention — .+ : 4$/u),
      expect.stringMatching(/^Proxy-rétention — .+ : 5$/u),
    ]),
  );
  const table = page.getByRole("table");
  await expect
    .element(page.getByRole("link", { name: /Consulter les valeurs par semaine/u }))
    .toHaveAttribute("href", "#comparaison-aarri");
  await expect
    .element(table.getByRole("row").filter({ hasText: "Proxy-impact" }))
    .toMatchTextContent(/\+1/u);
  await expect
    .element(table.getByRole("row").filter({ hasText: "Proxy-rétention" }))
    .toMatchTextContent(/-1/u);
  await expect.element(page.getByRole("heading", { name: "Proxy-impact" })).toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Proxy-rétention" })).toBeVisible();
});

test("handles an empty indicators response", async () => {
  render(IndicatorsAARRI, { indicatorsByDateP: Promise.resolve([]) });
  await expect.element(page.getByText("Aucun indicateur disponible.")).toBeVisible();
});
