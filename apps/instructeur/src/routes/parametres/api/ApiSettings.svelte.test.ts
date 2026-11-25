import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../../app.css";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { accountReadScope, dossierReadScope } from "@pitchou/types/externalApi.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import ApiSettings from "./+page.svelte";

vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn().mockResolvedValue(undefined) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("submits the numeric lifetime chosen with the keyboard and displays the issued key", async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      key: { id: "key-id", label: "Mon script" },
      secret: "issued-secret",
    }),
  );
  vi.stubGlobal("fetch", fetch);
  render(ApiSettings, {
    data: { keys: [], canReadDossiers: true, userId: 1 as UserId },
    params: {},
    form: null,
  });

  const label = page.getByRole("textbox", { name: "Nom de la clé" });
  await expect.element(label).toHaveAttribute("autocomplete", "off");
  await label.fill("Mon script");
  await page.getByRole("combobox", { name: "Durée de validité" }).click();
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await page.getByRole("button", { name: "Créer la clé" }).click();

  expect(fetch).toHaveBeenCalledWith(
    "/parametres/api/keys",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ label: "Mon script", scopes: [dossierReadScope], days: 90 }),
    }),
  );
  const secret = page.getByRole("textbox", { name: "Jeton d’accès" });
  await expect.element(secret).toHaveValue("issued-secret");
  await expect.element(secret).toHaveAttribute("autocomplete", "off");
  await page.getByRole("button", { name: "Masquer" }).click();
  await expect.element(secret).not.toBeInTheDocument();
});

test("offers account permissions to users without dossier access", async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      key: { id: "key-id", label: "Mon compte" },
      secret: "issued-secret",
    }),
  );
  vi.stubGlobal("fetch", fetch);
  render(ApiSettings, {
    data: { keys: [], canReadDossiers: false, userId: 1 as UserId },
    params: {},
    form: null,
  });

  await expect.element(page.getByText("Consulter les dossiers")).not.toBeInTheDocument();
  await page.getByRole("textbox", { name: "Nom de la clé" }).fill("Mon compte");
  const create = page.getByRole("button", { name: "Créer la clé" });
  await expect.element(create).toBeDisabled();
  await page.getByText("Consulter mon compte, mes groupes et mes notifications").click();
  await create.click();
  expect(fetch).toHaveBeenCalledWith(
    "/parametres/api/keys",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ label: "Mon compte", scopes: [accountReadScope], days: 30 }),
    }),
  );
});
