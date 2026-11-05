import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import type { AdminDossierDetail } from "#lib/actions/adminDossiers.ts";
import OrganisationIntakeFixture from "./OrganisationIntakeFixture.svelte";

afterEach(cleanup);

const organisation = {
  type: "organisation" as const,
  name: "Syndicat de l'Étang",
  address: "1 rue du Lac",
  siren: null,
  verification_status: "source_declared" as const,
  verification_evidence: null,
  source: "onagre",
  source_reference: "ORG-42",
};
const detail = {
  dossier: {
    id: 42,
    name: "Projet du lac",
    demarche_numerique_number: null,
    demarche_number: null,
    depot_date: null,
  },
  source: "pitchou",
  phase: "Accompagnement amont",
  managedByDn: false,
  porteur_de_projet: organisation,
  acteurs: [],
  groupes: [],
  evenementsPhase: [],
  piecesJointes: [],
  especesImpactees: null,
} satisfies AdminDossierDetail;

test("editing an organisation preserves its provenance and requires evidence before verification", async () => {
  const onSave = vi.fn();
  render(OrganisationIntakeFixture, { detail, onSave });
  expect(screen.getByRole("radio", { name: /organisation sans SIRET/u })).toBeChecked();
  expect(screen.getByLabelText(/Nom de l'organisation/u)).toHaveValue("Syndicat de l'Étang");
  expect(screen.getByText("Organisation déclarée dans Onagre — à vérifier")).toBeTruthy();
  expect(screen.queryByLabelText(/Numéro de SIRET/u)).toBeNull();
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur" }));
  expect(onSave).toHaveBeenLastCalledWith({
    demandeur_type: "organisation",
    demandeur_organisation: {
      name: organisation.name,
      address: organisation.address,
      siren: null,
      verification_status: "source_declared",
      source: "onagre",
      source_reference: "ORG-42",
      verification_evidence: null,
    },
    demandeur_personne_physique: null,
    demandeur_personne_morale: null,
    identites: [],
  });
  await fireEvent.change(screen.getByLabelText("Vérification de l'organisation"), {
    target: { value: "verified" },
  });
  expect(screen.getByText("Renseignez le justificatif de vérification.")).toBeTruthy();
  await fireEvent.input(screen.getByLabelText(/Justificatif de vérification/u), {
    target: { value: "Registre consulté le 4 novembre 2026" },
  });
  await fireEvent.input(screen.getByLabelText("SIREN de l'organisation"), {
    target: { value: "123 456 789" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur" }));
  expect(onSave.mock.lastCall?.[0].demandeur_organisation).toMatchObject({
    verification_status: "verified",
    siren: "123456789",
    verification_evidence: "Registre consulté le 4 novembre 2026",
    source_reference: "ORG-42",
  });
});

test("replacing organisation with a real SIRET leaves no organisation or fabricated person in the payload", async () => {
  const onSave = vi.fn();
  render(OrganisationIntakeFixture, { detail, onSave });
  await fireEvent.click(screen.getByRole("radio", { name: "Personne morale avec SIRET" }));
  expect(screen.queryByLabelText(/Nom de l'organisation/u)).toBeNull();
  const siret = screen.getByLabelText(/Numéro de SIRET/u);
  expect(siret).toHaveValue("");
  await fireEvent.input(siret, { target: { value: "432 296 234 00029" } });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le porteur" }));
  expect(onSave.mock.lastCall?.[0]).toMatchObject({
    demandeur_type: "personne_morale",
    demandeur_personne_morale: { siret: "43229623400029" },
    demandeur_personne_physique: null,
  });
  expect(onSave.mock.lastCall?.[0]).not.toHaveProperty("demandeur_organisation");
  await fireEvent.click(screen.getByRole("radio", { name: /organisation sans SIRET/u }));
  expect(screen.getByLabelText(/Nom de l'organisation/u)).toHaveValue(organisation.name);
  expect(screen.getByLabelText(/Référence dans la source/u)).toHaveValue("ORG-42");
});

test("physical and SIRET porteurs retain their existing editing fields and have no verified organisation label", async () => {
  render(OrganisationIntakeFixture, {
    detail: {
      ...detail,
      porteur_de_projet: {
        type: "personne_physique",
        last_name: "Martin",
        first_names: "Camille",
        email: null,
        address: null,
        phone: null,
        role: null,
      },
    },
    onSave: vi.fn(),
  });
  expect(screen.getByLabelText(/^Nom/u)).toHaveValue("Martin");
  expect(screen.getByLabelText(/^Prénom/u)).toHaveValue("Camille");
  expect(screen.queryByText(/Organisation vérifiée/u)).toBeNull();
  cleanup();
  render(OrganisationIntakeFixture, {
    detail: {
      ...detail,
      porteur_de_projet: {
        type: "personne_morale",
        siret: "43229623400029",
        legal_name: "Association existante",
      } as AdminDossierDetail["porteur_de_projet"],
    },
    onSave: vi.fn(),
  });
  expect(screen.getByLabelText(/Numéro de SIRET/u)).toHaveValue("43229623400029");
  expect(screen.queryByText(/Organisation vérifiée/u)).toBeNull();
});
