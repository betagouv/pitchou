import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../app.css";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { pageHeader } from "#lib/pageHeader.svelte.ts";
import {
  dossierInternalScope,
  dossierReadScope,
  type ApiGrant,
} from "@pitchou/types/externalApi.ts";
import IntegrationsApi from "./+page.svelte";

vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn().mockResolvedValue(undefined) }));

const layoutData = { user: null, isAdmin: true, maxUploadSizeBytes: 1024 };
const grantUrl = "/api/integrations-api/service-geomce/grants";

function renderIntegration(grants: ApiGrant[] = []) {
  return render(IntegrationsApi, {
    params: {},
    form: null,
    data: {
      ...layoutData,
      integrations: [
        {
          id: "service-geomce",
          name: "GeoMCE",
          enabled: true,
          allowOAuth: false,
          grants: grants.map((grant) => ({ ...grant, clientId: "service-geomce" })),
          keys: [],
        },
      ],
      groupes: [{ id: "group-id", name: "Groupe test" }],
    },
  });
}

async function openHabilitations() {
  await page.getByText("GeoMCE", { exact: true }).click();
  await page.getByRole("tab", { name: "Habilitations", exact: true }).click();
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("opens the standard add dialog and submits the service name", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: "service-geomce" }, { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  render(IntegrationsApi, {
    data: { ...layoutData, integrations: [], groupes: [] },
    params: {},
    form: null,
  });

  expect(pageHeader.action?.label).toBe("Ajouter un service");
  pageHeader.action?.onClick();

  const dialog = page.getByRole("dialog", { name: "Ajouter un service" });
  const name = dialog.getByRole("textbox", { name: "Nom du service" });
  await expect.element(name).toHaveFocus();
  const close = dialog.getByRole("button", { name: "Fermer" }).element();
  const buttonBounds = close.getBoundingClientRect();
  const iconBounds = close.querySelector("[aria-hidden='true']")!.getBoundingClientRect();
  expect(buttonBounds.width).toBeCloseTo(buttonBounds.height);
  expect(iconBounds.left - buttonBounds.left).toBeCloseTo(buttonBounds.right - iconBounds.right);
  expect(iconBounds.top - buttonBounds.top).toBeCloseTo(buttonBounds.bottom - iconBounds.bottom);
  await expect.element(name).toHaveAttribute("autocomplete", "off");
  await name.fill("GeoMCE");
  await dialog.getByRole("button", { name: "Ajouter un service" }).click();
  await expect.element(dialog).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    "/api/integrations-api",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "GeoMCE" }) }),
  );
});

test("adds a group grant using the custom dropdowns", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  renderIntegration();

  await openHabilitations();
  await page.getByRole("button", { name: "Ajouter une habilitation" }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter une habilitation" });
  const dossier = dialog.getByRole("spinbutton", { name: "Numéro de dossier Pitchou" });
  const target = dialog.getByRole("combobox", { name: "Périmètre" });
  await expect.element(dossier).toHaveAttribute("autocomplete", "off");
  await expect.element(target).toHaveFocus();
  await target.click();
  const list = dialog.getByRole("listbox").element();
  expect(list.getBoundingClientRect().width).toBeCloseTo(
    target.element().getBoundingClientRect().width,
  );
  expect(list.scrollWidth).toBe(list.clientWidth);
  await dialog.getByRole("option", { name: "Un groupe instructeur" }).click();
  await expect.element(dossier).not.toBeInTheDocument();
  await dialog.getByRole("combobox", { name: "Groupe instructeur" }).click();
  await dialog.getByRole("option", { name: "Groupe test" }).click();
  await dialog.getByRole("combobox", { name: "Permission" }).click();
  await dialog.getByRole("option", { name: "Lecture restreinte" }).click();
  await dialog.getByRole("button", { name: "Ajouter l’habilitation" }).click();

  await expect.element(dialog).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    grantUrl,
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ groupeId: "group-id", scope: dossierReadScope }),
    }),
  );
});

test("adds and removes an all-dossiers grant without a dossier or a group", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  renderIntegration([{ allDossiers: true, label: "Tous les dossiers", scope: dossierReadScope }]);

  await openHabilitations();
  await page.getByRole("button", { name: "Ajouter une habilitation" }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter une habilitation" });
  await dialog.getByRole("combobox", { name: "Périmètre" }).click();
  await dialog.getByRole("option", { name: "Tous les dossiers" }).click();
  await expect.element(dialog.getByText(/dossiers existants et futurs/u)).toBeVisible();
  await expect.element(dialog.getByRole("spinbutton")).not.toBeInTheDocument();
  await dialog.getByRole("combobox", { name: "Permission" }).click();
  await dialog.getByRole("option", { name: "Lecture complète" }).click();
  await expect.element(dialog.getByText(/exige aussi une habilitation/u)).toBeVisible();
  await dialog.getByRole("button", { name: "Ajouter l’habilitation" }).click();
  await expect.element(dialog).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    grantUrl,
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ allDossiers: true, scope: dossierInternalScope }),
    }),
  );

  await page.getByRole("button", { name: /Retirer l’habilitation Tous les dossiers/u }).click();
  expect(fetch).toHaveBeenCalledWith(
    grantUrl,
    expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ allDossiers: true, scope: dossierReadScope }),
    }),
  );
});

test("a single service starts closed and its activation controls are in the settings tab", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  const { container } = renderIntegration();
  expect(container.querySelector("details")?.open).toBe(false);
  await page.getByText("GeoMCE", { exact: true }).click();

  const keys = page.getByRole("tab", { name: "Clés", exact: true });
  const grants = page.getByRole("tab", { name: "Habilitations", exact: true });
  const settings = page.getByRole("tab", { name: "Paramètres", exact: true });
  await expect.element(keys).toHaveAttribute("aria-selected", "true");
  await expect.element(page.getByRole("tabpanel", { name: "Clés", exact: true })).toBeVisible();
  await expect.element(page.getByText("Identifiant du service")).not.toBeVisible();

  await keys.click();
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(grants).toHaveFocus();
  await expect.element(grants).toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{End}");
  await expect.element(settings).toHaveFocus();
  await expect.element(settings).toHaveAttribute("aria-selected", "true");
  await expect.element(page.getByText("Identifiant du service")).toBeVisible();
  await page.getByRole("button", { name: "Désactiver le service" }).click();
  expect(fetch).toHaveBeenCalledWith(
    "/api/integrations-api/service-geomce",
    expect.objectContaining({ method: "PATCH", body: JSON.stringify({ enabled: false }) }),
  );
});
