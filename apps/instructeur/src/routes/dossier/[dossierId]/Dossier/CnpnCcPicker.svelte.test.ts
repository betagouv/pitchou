import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import { store } from "$lib/state/store.svelte.ts";
import CnpnCcPicker from "./CnpnCcPicker.svelte";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

afterEach(() => {
  cleanup();
  store.capabilities = {};
});

test("recherche un instructeur et permet de le retirer des copies", async () => {
  store.capabilities.listDossierFollowerCandidates = vi.fn().mockResolvedValue([
    {
      email: "camille.dupont@example.com",
      firstNames: "Camille",
      lastName: "Dupont",
      followsDossier: false,
    },
    {
      email: "alex.martin@example.com",
      firstNames: "Alex",
      lastName: "Martin",
      followsDossier: false,
    },
  ]);
  render(CnpnCcPicker, {
    dossierId: 42 as DossierId,
    selectedEmails: [],
  });

  await page.getByLabelText(/En copie/).fill("Camille");
  const listbox = await page.getByRole("listbox").element();
  const option = await page.getByRole("option", { name: /Camille Dupont/ }).element();
  expect(listbox.getBoundingClientRect().height).toBeLessThanOrEqual(
    option.getBoundingClientRect().height + 4,
  );
  expect(option.getBoundingClientRect().height).toBeLessThanOrEqual(68);
  document.body.click();
  await expect
    .element(page.getByRole("option", { name: /Camille Dupont/ }))
    .not.toBeInTheDocument();

  await page.getByLabelText(/En copie/).fill("Camille");
  await page.getByRole("option", { name: /Camille Dupont/ }).click();
  await expect.element(page.getByText("camille.dupont@example.com")).toBeVisible();

  await page.getByLabelText(/En copie/).click();
  await page.getByRole("option", { name: /Alex Martin/ }).click();
  await expect.element(page.getByText("alex.martin@example.com")).toBeVisible();

  await page
    .getByRole("button", { name: "Retirer camille.dupont@example.com des personnes en copie" })
    .click();
  await expect.element(page.getByText("camille.dupont@example.com")).not.toBeInTheDocument();
});
