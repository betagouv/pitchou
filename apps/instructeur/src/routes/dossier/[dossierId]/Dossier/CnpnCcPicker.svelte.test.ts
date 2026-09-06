import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import { store } from "$lib/state/store.svelte.ts";
import CnpnCcPicker from "./CnpnCcPicker.svelte";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

let dialog: HTMLDialogElement | undefined;

afterEach(() => {
  cleanup();
  dialog?.remove();
  dialog = undefined;
  store.capabilities = {};
});

function renderInDialog() {
  dialog = document.createElement("dialog");
  const form = document.createElement("form");
  form.method = "dialog";
  const onSubmit = vi.fn();
  form.addEventListener("submit", onSubmit);
  dialog.append(form);
  document.body.append(dialog);
  render(CnpnCcPicker, {
    target: form,
    props: { dossierId: 42 as DossierId, selectedEmails: [] },
  });
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Envoyer";
  form.append(submit);
  dialog.showModal();
  return { dialog, onSubmit };
}

test.each([
  { scenario: "no results", query: "unknown", key: "", selected: undefined },
  { scenario: "multiple results", query: "", key: "", selected: undefined },
  { scenario: "closed dropdown", query: "", key: "{Escape}", selected: undefined },
  {
    scenario: "one result",
    query: "Camille",
    key: "",
    selected: "camille.dupont@example.com",
  },
  {
    scenario: "active result",
    query: "",
    key: "{ArrowDown}",
    selected: "camille.dupont@example.com",
  },
  { scenario: "new email", query: "new@example.com", key: "", selected: "new@example.com" },
])("Enter never submits the form with $scenario", async ({ query, key, selected }) => {
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
  const { dialog, onSubmit } = renderInDialog();
  await expect.element(page.getByRole("option", { name: /Camille Dupont/ })).toBeVisible();
  await page.getByRole("combobox").fill(query);
  if (key) await userEvent.keyboard(key);
  await userEvent.keyboard("{Enter}");

  expect(onSubmit).not.toHaveBeenCalled();
  expect(dialog.open).toBe(true);
  if (selected) {
    await expect
      .element(page.getByRole("button", { name: `Retirer ${selected} des personnes en copie` }))
      .toBeVisible();
  } else {
    await expect.element(page.getByRole("button", { name: /^Retirer / })).not.toBeInTheDocument();
  }

  await page.getByRole("button", { name: "Envoyer" }).click();
  expect(onSubmit).toHaveBeenCalledOnce();
  await expect.poll(() => dialog.open).toBe(false);
});

test("Escape dismisses the dropdown before allowing the native modal to close", async () => {
  const { dialog, onSubmit } = renderInDialog();
  const input = page.getByRole("combobox");
  await input.fill("new@example.com");
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(input).toHaveAttribute("aria-activedescendant", "cnpn-cc-42-listbox-0");

  await userEvent.keyboard("{Escape}");

  await expect.element(input).toHaveAttribute("aria-expanded", "false");
  await expect.element(input).not.toHaveAttribute("aria-activedescendant");
  await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
  expect(dialog.open).toBe(true);
  await expect.element(input).toHaveFocus();

  await userEvent.keyboard("{Escape}");

  await expect.poll(() => dialog.open).toBe(false);
  expect(onSubmit).not.toHaveBeenCalled();
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
