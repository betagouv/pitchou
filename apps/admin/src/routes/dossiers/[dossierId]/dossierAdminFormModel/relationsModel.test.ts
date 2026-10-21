import { describe, expect, it } from "vitest";

import type { AdminDossierDetail } from "#lib/actions/adminDossiers.ts";

import { buildDossierRelations, createDossierAdminRelationsModel } from "./relationsModel.ts";

describe("dossier admin relations model", () => {
  it("does not fabricate a deposant identity for a legal dossier", () => {
    const detail = {
      dossier: {
        id: 1,
        name: "Projet test",
        demarche_numerique_number: null,
        demarche_number: null,
        depot_date: "2026-08-01",
      },
      porteur_de_projet: {
        type: "personne_morale",
        siret: "12345678901234",
        legal_name: "Entreprise test",
        address: null,
        postal_code: null,
        department: null,
        region: null,
      } as AdminDossierDetail["porteur_de_projet"],
      groupes: [{ id: "groupe-1", name: "Groupe test" }],
      acteurs: [
        {
          involvements: ["personne_contact"],
          last_name: "Durand",
          first_names: "Lou",
          email: null,
          address: null,
          phone: null,
          role: "Directrice",
        },
      ],
      source: "pitchou",
      managedByDn: false,
      phase: "Accompagnement amont",
      evenementsPhase: [],
      piecesJointes: [],
      especesImpactees: null,
    } satisfies AdminDossierDetail;

    const relations = buildDossierRelations(createDossierAdminRelationsModel(detail));

    expect(relations.identites).toEqual([
      expect.objectContaining({ type: "representant", last_name: "Durand" }),
    ]);
  });

  it("reads the mandataire and the personne contact from the acteurs, whatever the porteur type", () => {
    const detail = {
      dossier: {
        id: 1,
        name: "Projet test",
        demarche_numerique_number: null,
        demarche_number: null,
        depot_date: "2026-08-01",
      },
      porteur_de_projet: {
        type: "personne_physique",
        last_name: "Martin",
        first_names: "Camille",
        email: null,
        address: null,
        phone: null,
        role: null,
      } as AdminDossierDetail["porteur_de_projet"],
      groupes: [{ id: "groupe-1", name: "Groupe test" }],
      acteurs: [
        {
          involvements: ["mandataire", "deposant"],
          last_name: "Dupont",
          first_names: "Jean",
          email: "jean@test.fr",
          address: null,
          phone: null,
          role: null,
        },
        {
          involvements: ["personne_contact"],
          last_name: "Leroy",
          first_names: "Anne",
          email: null,
          address: null,
          phone: "0612345678",
          role: null,
        },
      ],
      source: "pitchou",
      managedByDn: false,
      phase: "Accompagnement amont",
      evenementsPhase: [],
      piecesJointes: [],
      especesImpactees: null,
    } satisfies AdminDossierDetail;

    const model = createDossierAdminRelationsModel(detail);
    expect(model).toMatchObject({
      hasMandataire: true,
      mandataire: { lastName: "Dupont", email: "jean@test.fr" },
      hasPersonneContact: true,
      personneContact: { lastName: "Leroy", phone: "0612345678" },
      demandeurIdentity: { lastName: "Martin" },
    });
    expect(buildDossierRelations(model).identites.map(({ type }) => type)).toEqual([
      "demandeur",
      "mandataire",
      "representant",
    ]);
  });
});
