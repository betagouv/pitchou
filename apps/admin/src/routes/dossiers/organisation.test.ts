import { expect, test } from "vitest";
import { organisationForm, organisationErrors, organisationPayload } from "./organisation.ts";
import { emptyPorteurForm, porteurFormErrors, porteurPayload } from "./createDossierPorteur.ts";
import {
  buildDossierRelations,
  createDossierAdminRelationsModel,
} from "./[dossierId]/dossierAdminFormModel/relationsModel.ts";
import type { AdminDossierDetail } from "#lib/actions/adminDossiers.ts";

const organisation = {
  name: " Syndicat des marais ",
  address: null,
  source: "onagre",
  source_reference: "ORG-42",
  verification_status: "source_declared" as const,
  verification_evidence: null,
  siren: null,
};

test("minimal creation validates organisation provenance and carries only the selected identity", () => {
  const form = { ...emptyPorteurForm(), type: "organisation" as const };
  expect(porteurFormErrors(form)).toHaveProperty("organisation");
  form.organisation = organisationForm(organisation);
  expect(porteurFormErrors(form)).toEqual({});
  expect(porteurPayload(form)).toEqual({
    type: "organisation",
    ...organisation,
    name: "Syndicat des marais",
  });
});

test("declared status clears SIREN and evidence, verified status requires evidence and validates SIREN", () => {
  const form = organisationForm(organisation);
  form.siren = "123456789";
  form.verification_evidence = "Ancienne recherche";
  expect(organisationPayload(form)).toMatchObject({ siren: null, verification_evidence: null });
  form.verification_status = "verified";
  form.verification_evidence = " ";
  form.siren = "123";
  expect(organisationErrors(form)).toMatchObject({
    siren: "Le numéro de SIREN doit contenir 9 chiffres.",
    verification_evidence: "Renseignez le justificatif de vérification.",
  });
  form.siren = "123 456 789";
  form.verification_evidence = "Registre consulté";
  expect(organisationErrors(form)).toEqual({});
  expect(organisationPayload(form)).toMatchObject({
    siren: "123456789",
    verification_evidence: "Registre consulté",
  });
});

test("legacy editor retains the organisation and does not fabricate a physical demandeur", () => {
  const model = createDossierAdminRelationsModel({
    porteur_de_projet: { type: "organisation", ...organisation },
    acteurs: [],
  } as unknown as AdminDossierDetail);
  expect(model.demandeurType).toBe("organisation");
  expect(buildDossierRelations(model)).toEqual({
    demandeur_type: "organisation",
    demandeur_organisation: { ...organisation, name: "Syndicat des marais" },
    demandeur_personne_physique: null,
    demandeur_personne_morale: null,
    identites: [],
  });
  model.demandeurType = "personne_morale";
  model.personneMorale.siret = "43229623400029";
  expect(buildDossierRelations(model)).not.toHaveProperty("demandeur_organisation");
});
