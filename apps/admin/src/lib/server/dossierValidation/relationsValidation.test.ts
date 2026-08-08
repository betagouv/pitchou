import { describe, expect, test } from "vitest";

import { parseDossierRelations } from "./relationsValidation.ts";

const physicalRelations = {
  groupe_instructeurs: "groupe-1",
  demandeur_type: "personne_physique",
  demandeur_personne_physique: {
    last_name: "Martin",
    first_names: "Camille",
    email: "CAMILLE@example.org",
    address: null,
    phone: null,
    role: null,
  },
  demandeur_personne_morale: null,
  identites: [
    {
      type: "demandeur",
      last_name: "Martin",
      first_names: "Camille",
      email: "CAMILLE@example.org",
      phone: null,
      role: null,
    },
  ],
};

describe("parseDossierRelations", () => {
  test("accepts and normalizes a complete physical demandeur", () => {
    expect(parseDossierRelations(physicalRelations)).toMatchObject({
      demandeur_type: "personne_physique",
      demandeur_personne_physique: { email: "camille@example.org" },
      identites: [{ type: "demandeur", email: "camille@example.org" }],
    });
  });

  test("rejects duplicate identities and mismatched demandeur data", () => {
    expect(() =>
      parseDossierRelations({
        ...physicalRelations,
        identites: [...physicalRelations.identites, physicalRelations.identites[0]],
      }),
    ).toThrow();
    expect(() =>
      parseDossierRelations({
        ...physicalRelations,
        demandeur_personne_morale: { siret: "12345678901234" },
      }),
    ).toThrow();
  });

  test("accepts a legal demandeur with only a representative identity", () => {
    const legalRelations = {
      ...physicalRelations,
      demandeur_type: "personne_morale",
      demandeur_personne_physique: null,
      demandeur_personne_morale: {
        siret: "12345678901234",
        legal_name: "Entreprise test",
        address: null,
        postal_code: null,
        department: null,
        region: null,
      },
      identites: [{ ...physicalRelations.identites[0], type: "representant" }],
    };

    expect(parseDossierRelations(legalRelations)).toMatchObject({
      demandeur_type: "personne_morale",
      identites: [{ type: "representant" }],
    });
  });
});
