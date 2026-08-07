import { describe, expect, it } from "vitest";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import {
  buildDossierRelations,
  createDossierAdminRelationsModel,
} from "./dossierAdminRelationsModel.ts";

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
      demandeur_personne_physique: null,
      demandeur_personne_morale: {
        siret: "12345678901234",
        legal_name: "Entreprise test",
        address: null,
        postal_code: null,
        department: null,
        region: null,
      },
      groupe: { id: "groupe-1", name: "Groupe test" },
      identites: [
        {
          type: "representant",
          last_name: "Durand",
          first_names: "Lou",
          email: null,
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
});
