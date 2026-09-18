import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import ImpactEspeceFixture from "./ImpactEspeceFixture.svelte";
import {
  activite,
  autreActivite,
  initialImpact,
  methode,
  transport,
} from "./impactEspece.fixture.ts";

afterEach(cleanup);

async function select(label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("displays selected reference objects through the parent's state proxy", async () => {
  const { component } = render(ImpactEspeceFixture);
  expect(component.getImpact().activité).not.toBe(activite);
  expect(component.getImpact().méthode).not.toBe(methode);
  expect(component.getImpact().moyenDePoursuite).not.toBe(transport);

  for (const [label, value] of [
    ["Type d’impact", "Capture"],
    ["Méthode", "Filets"],
    ["Moyen de poursuite", "Avion"],
  ]) {
    const trigger = page.getByRole("combobox", { name: label, exact: true });
    await expect.element(trigger).toHaveTextContent(value);
    await trigger.click();
    await expect
      .element(page.getByRole("option", { name: value, exact: true }))
      .toHaveAttribute("aria-selected", "true");
    await trigger.click();
  }
});

test("reselecting the same activity preserves every quantity, method and transport", async () => {
  const { component } = render(ImpactEspeceFixture);
  await select("Type d’impact", "Capture");
  expect(component.getImpact()).toEqual(initialImpact);
  await expect
    .element(page.getByRole("combobox", { name: "Nombre d’individus" }))
    .toHaveTextContent("11-100");
  await expect.element(page.getByRole("spinbutton", { name: "Nids", exact: true })).toHaveValue(0);
  await expect.element(page.getByRole("spinbutton", { name: "Œufs" })).toHaveValue(3);
  await expect
    .element(page.getByRole("spinbutton", { name: "Surface habitat détruit (m²)" }))
    .toHaveValue(42);
});

test.each(["Destruction", "-"])("changing activity to %s clears all details", async (option) => {
  const { component } = render(ImpactEspeceFixture);
  await select("Type d’impact", option);
  expect(component.getImpact()).toEqual({
    activité: option === "-" ? undefined : autreActivite,
    méthode: undefined,
    moyenDePoursuite: undefined,
    nombreIndividus: undefined,
    nombreNids: undefined,
    nombreOeufs: undefined,
    surfaceHabitatDétruit: undefined,
  });
  await expect
    .element(page.getByRole("combobox", { name: "Type d’impact" }))
    .toHaveTextContent(option);
});

test("method and transport selections keep reference objects in the bound impact", async () => {
  const { component } = render(ImpactEspeceFixture);
  await select("Méthode", "-");
  await select("Moyen de poursuite", "-");
  expect(component.getImpact()).toEqual({
    ...initialImpact,
    méthode: undefined,
    moyenDePoursuite: undefined,
  });

  await select("Méthode", "Filets");
  await select("Moyen de poursuite", "Avion");
  expect(component.getImpact()).toEqual(initialImpact);
  await expect
    .element(page.getByRole("combobox", { name: "Méthode", exact: true }))
    .toHaveTextContent("Filets");
  await expect
    .element(page.getByRole("combobox", { name: "Moyen de poursuite" }))
    .toHaveTextContent("Avion");
});
