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
  await expect.element(start).toHaveTextContent("1 octobre 2026");
  await expect.element(end).toHaveTextContent("15 octobre 2026");
  await expect
    .element(page.getByRole("row").filter({ hasText: "Acquis" }))
    .toHaveTextContent("200 %");

  await start.click();
  await page.getByRole("option", { name: "8 octobre 2026", exact: true }).click();
  await expect
    .element(page.getByRole("row").filter({ hasText: "Acquis" }))
    .toHaveTextContent("50 %");

  await view.rerender({ indicatorsByDateP: Promise.resolve([...indicators]) });
  await expect.element(start).toHaveTextContent("8 octobre 2026");
  await expect.element(end).toHaveTextContent("15 octobre 2026");
});

test("shows an error when the indicators cannot load", async () => {
  const pending = Promise.withResolvers<Indicators[]>();
  render(IndicatorsAARRI, { indicatorsByDateP: pending.promise });
  pending.reject(new Error("Request failed"));
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Impossible de charger les indicateurs.");
});

test("handles an empty indicators response", async () => {
  render(IndicatorsAARRI, { indicatorsByDateP: Promise.resolve([]) });
  await expect.element(page.getByText("Aucun indicateur disponible.")).toBeVisible();
});
