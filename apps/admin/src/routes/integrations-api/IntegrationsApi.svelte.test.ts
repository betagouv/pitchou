import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../app.css";
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { pageHeader } from "#lib/pageHeader.svelte.ts";
import { dossierReadScope } from "@pitchou/types/externalApi.ts";
import IntegrationsApi from "./+page.svelte";

vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn().mockResolvedValue(undefined) }));

const layoutData = { user: null, isAdmin: true, maxUploadSizeBytes: 1024 };

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
  render(IntegrationsApi, {
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
          grants: [],
          keys: [],
        },
      ],
      groupes: [{ id: "group-id", name: "Groupe test" }],
    },
  });

  const dossier = page.getByRole("spinbutton", { name: "Numéro de dossier Pitchou" });
  await expect.element(dossier).toHaveAttribute("autocomplete", "off");
  await page.getByRole("combobox", { name: "Type de ressource" }).click();
  await page.getByRole("option", { name: "Groupe instructeur" }).click();
  await expect.element(dossier).not.toBeInTheDocument();
  await page.getByRole("combobox", { name: "Groupe instructeur" }).click();
  await page.getByRole("option", { name: "Groupe test" }).click();
  await page.getByRole("combobox", { name: "Permission" }).click();
  await page.getByRole("option", { name: "Consulter les dossiers" }).click();
  await page.getByRole("button", { name: "Ajouter l’habilitation" }).click();

  expect(fetch).toHaveBeenCalledWith(
    "/api/integrations-api/service-geomce/grants",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ groupeId: "group-id", scope: dossierReadScope }),
    }),
  );
});
