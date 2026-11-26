import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../app.css";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { dossierReadScope } from "@pitchou/types/externalApi.ts";
import ApiIntegrationPanel from "./ApiIntegrationPanel.svelte";

vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn().mockResolvedValue(undefined) }));

const endpoint = "/api/integrations-api/service-geomce/keys";
const key = {
  id: "key-test",
  label: "Suivi de dossiers",
  scopes: [dossierReadScope],
  expiresAt: "2099-06-01T12:00:00Z",
  lastUsedAt: null,
  revokedAt: null,
};

function renderService() {
  return render(ApiIntegrationPanel, {
    open: true,
    groupes: [],
    integration: {
      id: "service-geomce",
      name: "GeoMCE",
      allowOAuth: false,
      enabled: true,
      grants: [],
      keys: [{ ...key, clientId: "service-geomce" }],
    },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("lists service keys, creates a one-year key in the dialog, and clears its secret on close", async () => {
  await page.viewport(960, 800);
  const secret = "service-test-token";
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockRejectedValueOnce(new Error("Clipboard unavailable"))
    .mockResolvedValueOnce(undefined);
  const fetch = vi.fn().mockResolvedValue(Response.json({ key, secret }, { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  renderService();

  const add = page.getByRole("button", { name: "Créer une clé de service" });
  await expect.element(page.getByText(key.label, { exact: true })).toBeVisible();
  await expect
    .element(page.getByRole("textbox", { name: "Nom de la clé" }))
    .not.toBeInTheDocument();
  await add.click();
  const dialog = page.getByRole("dialog", { name: "Créer une clé de service" });
  const label = dialog.getByRole("textbox", { name: "Nom de la clé" });
  await expect.element(label).toHaveFocus();
  await expect.element(label).toHaveAttribute("autocomplete", "off");
  await label.fill(key.label);
  await dialog.getByRole("combobox", { name: "Durée de validité" }).click();
  await expect.element(dialog.getByRole("option", { name: "180 jours" })).toBeVisible();
  await dialog.getByRole("option", { name: "1 an (365 jours)" }).click();
  await dialog.getByRole("button", { name: "Créer la clé" }).click();

  const issued = page.getByRole("dialog", { name: "Clé de service créée" });
  const token = issued.getByRole("textbox", { name: "Jeton d’accès" });
  await expect.element(token).toHaveValue(secret);
  await expect.element(token).toHaveFocus();
  const copy = issued.getByRole("button", { name: "Copier la clé" });
  const finish = issued.getByRole("button", { name: "Terminer" });
  const tokenBounds = token.element().getBoundingClientRect();
  const copyBounds = copy.element().getBoundingClientRect();
  expect(copyBounds.left).toBeGreaterThanOrEqual(tokenBounds.right);
  expect(copyBounds.top).toBeLessThan(tokenBounds.bottom);
  expect(finish.element().getBoundingClientRect().right).toBeCloseTo(copyBounds.right);

  await page.viewport(360, 800);
  expect(copy.element().getBoundingClientRect().top).toBeGreaterThanOrEqual(
    token.element().getBoundingClientRect().bottom,
  );
  await page.viewport(960, 800);

  await copy.click();
  await expect.element(issued.getByText("Copiez le jeton sélectionné.")).toBeVisible();
  await expect.element(token).toHaveFocus();
  await copy.click();
  await expect.element(issued.getByText("Clé copiée.")).toBeVisible();
  expect(writeText).toHaveBeenLastCalledWith(secret);
  expect(fetch).toHaveBeenCalledWith(
    endpoint,
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ label: key.label, scopes: [dossierReadScope], days: 365 }),
    }),
  );

  await finish.click();
  await expect.element(issued).not.toBeInTheDocument();
  await add.click();
  await expect.element(dialog).toBeVisible();
  await expect
    .element(page.getByRole("textbox", { name: "Jeton d’accès" }))
    .not.toBeInTheDocument();
});

test("requires the basic dossier scope before selecting full read access", async () => {
  renderService();
  await page.getByRole("button", { name: "Créer une clé de service" }).click();
  const dialog = page.getByRole("dialog");
  const read = dialog.getByRole("checkbox", { name: "Consulter les dossiers", exact: true });
  const full = dialog.getByRole("checkbox", { name: "Lecture complète" });
  const readLabel = dialog.getByText("Consulter les dossiers", { exact: true });
  const fullLabel = dialog.getByText("Lecture complète", { exact: true });
  await readLabel.click();
  await expect.element(full).toBeDisabled();
  await readLabel.click();
  await fullLabel.click();
  await expect.element(read).toBeDisabled();
  await fullLabel.click();
  await expect.element(read).toBeEnabled();
});

test("revokes a listed key after confirmation without opening creation", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  renderService();
  await page.getByRole("button", { name: `Révoquer la clé ${key.label}` }).click();
  await page.getByRole("button", { name: "Confirmer la révocation" }).click();
  await expect.element(page.getByText("Clé révoquée.")).toBeVisible();
  expect(fetch).toHaveBeenCalledWith(
    endpoint,
    expect.objectContaining({ method: "DELETE", body: JSON.stringify({ id: key.id }) }),
  );
});
