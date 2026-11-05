import { expect, test } from "vitest";
import { withPorteurDeProjet } from "./porteur.ts";

const empty = {
  porteur_personne_physique: null,
  porteur_personne_morale: null,
  porteur_organisation: null,
  porteur_pp_last_name: null,
  porteur_entreprise_siret: null,
};

test("a personne physique porteur becomes a typed object and its flat columns are removed", () => {
  const dossier = withPorteurDeProjet({
    id: 1,
    ...empty,
    porteur_personne_physique: 7,
    porteur_pp_last_name: "Martin",
    porteur_pp_first_names: "Camille",
  });
  expect(dossier).toEqual({
    id: 1,
    porteur_de_projet: {
      type: "personne_physique",
      first_names: "Camille",
      last_name: "Martin",
      email: null,
      address: null,
      phone: null,
      role: null,
    },
  });
});

test("a personne morale porteur carries the entreprise", () => {
  const { porteur_de_projet } = withPorteurDeProjet({
    ...empty,
    porteur_personne_morale: "12345678900001",
    porteur_entreprise_siret: "12345678900001",
    porteur_entreprise_legal_name: "EDF",
  });
  expect(porteur_de_projet).toMatchObject({
    type: "personne_morale",
    siret: "12345678900001",
    legal_name: "EDF",
    address: null,
  });
});

test("a dossier without porteur gets null", () => {
  expect(withPorteurDeProjet({ id: 2, ...empty })).toEqual({ id: 2, porteur_de_projet: null });
});

test("an organisation carries its provenance without leaking database identifiers", () => {
  expect(
    withPorteurDeProjet({
      id: 2,
      ...empty,
      porteur_organisation: 4,
      porteur_organisation_name: "Commune de Tours",
      porteur_organisation_verification_status: "source_declared",
      porteur_organisation_source: "onagre",
      porteur_organisation_source_reference: "acteur-42",
    }),
  ).toEqual({
    id: 2,
    porteur_de_projet: {
      type: "organisation",
      name: "Commune de Tours",
      address: null,
      siren: null,
      verification_status: "source_declared",
      source: "onagre",
      source_reference: "acteur-42",
      verification_evidence: null,
    },
  });
});
