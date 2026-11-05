import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import type { AdminDossierDetail } from "#lib/actions/adminDossiers.ts";
import DossierOrganisationForm from "./DossierOrganisationForm.svelte";

vi.mock("$app/state", async () => ({
  page: {
    data: {
      user: { permissions: (await import("@pitchou/types/permissions.ts")).BUNDLES.administrateur },
    },
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const porteur = {
  type: "organisation" as const,
  name: "Syndicat de l'Étang",
  address: "1 rue du Lac",
  siren: null,
  verification_status: "source_declared" as const,
  source: "onagre",
  source_reference: "ORG-42",
  verification_evidence: null,
};
const detail = {
  dossier: {
    id: 42,
    name: "Projet du lac",
    demarche_numerique_number: null,
    demarche_number: null,
    depot_date: null,
  },
  source: "onagre",
  phase: "Instruction",
  managedByDn: false,
  porteur_de_projet: porteur,
  acteurs: [
    {
      involvements: ["personne_contact"],
      last_name: "Martin",
      first_names: "Camille",
      email: "camille@example.fr",
      phone: null,
      address: null,
      role: null,
    },
  ],
  groupes: [],
  evenementsPhase: [],
  piecesJointes: [],
  especesImpactees: null,
} satisfies AdminDossierDetail;

test("Onagre verification sends only the porteur, leaves contacts untouched and passes updated detail to parent", async () => {
  const updated = {
    ...detail,
    porteur_de_projet: {
      ...porteur,
      verification_status: "verified",
      verification_evidence: "Registre consulté",
    },
  };
  const fetchMock = vi.fn().mockResolvedValue(Response.json(updated));
  vi.stubGlobal("fetch", fetchMock);
  const onSaved = vi.fn();
  render(DossierOrganisationForm, { detail, onSaved });
  await fireEvent.change(screen.getByLabelText("Vérification de l'organisation"), {
    target: { value: "verified" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur de projet" }));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByLabelText(/Justificatif de vérification/u));
  await fireEvent.input(screen.getByLabelText(/Justificatif de vérification/u), {
    target: { value: "Registre consulté" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur de projet" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  const [url, options] = fetchMock.mock.lastCall!;
  expect(url).toBe("/api/dossiers/42/porteur");
  expect(options.method).toBe("PUT");
  expect(JSON.parse(options.body)).toEqual({ porteur_de_projet: updated.porteur_de_projet });
  expect(onSaved.mock.lastCall?.[0].acteurs).toEqual(detail.acteurs);
});

test("an unresolved Onagre owner can be documented without inventing an identifier", async () => {
  const updated = { ...detail, porteur_de_projet: { ...porteur, address: null } };
  const fetchMock = vi.fn().mockResolvedValue(Response.json(updated));
  vi.stubGlobal("fetch", fetchMock);
  const onSaved = vi.fn();
  render(DossierOrganisationForm, { detail: { ...detail, porteur_de_projet: null }, onSaved });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur de projet" }));
  expect(fetchMock).not.toHaveBeenCalled();
  for (const [id, value] of [
    ["name", porteur.name],
    ["source", porteur.source],
    ["source_reference", porteur.source_reference],
  ]) {
    await fireEvent.input(document.querySelector(`#onagre-porteur-${id}`)!, { target: { value } });
  }
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur de projet" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  expect(JSON.parse(fetchMock.mock.lastCall![1].body)).toEqual({
    porteur_de_projet: updated.porteur_de_projet,
  });
});

test("Onagre SIRET replacement validates input and retains edits after server failure", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ message: "Établissement introuvable" }), { status: 400 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const onSaved = vi.fn();
  render(DossierOrganisationForm, { detail, onSaved });
  await fireEvent.click(screen.getByRole("radio", { name: "Personne morale avec SIRET" }));
  const siret = screen.getByLabelText(/Numéro de SIRET/u);
  expect(siret).toHaveValue("");
  await fireEvent.input(siret, { target: { value: "1234" } });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur de projet" }));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByText("Le numéro de SIRET doit contenir 14 chiffres.")).toBeTruthy();
  await fireEvent.input(siret, { target: { value: "432 296 234 00029" } });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur de projet" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Établissement introuvable"),
  );
  expect(JSON.parse(fetchMock.mock.lastCall![1].body)).toEqual({
    porteur_de_projet: { type: "personne_morale", siret: "43229623400029" },
  });
  expect(onSaved).not.toHaveBeenCalled();
  expect(siret).toHaveValue("432 296 234 00029");
  const updated = {
    ...detail,
    porteur_de_projet: {
      type: "personne_morale",
      siret: "43229623400029",
      legal_name: "Syndicat de l'Étang",
    },
  };
  fetchMock.mockResolvedValueOnce(Response.json(updated));
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur de projet" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
});
