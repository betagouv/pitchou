import { describe, expect, it } from "vitest";
import { dossierRequestContextOptions } from "@pitchou/common/dossierFormOptions.ts";
import { parseDossierCreation, parseDossierUpdate } from "../dossierValidation.ts";
import { relations, validCreation } from "./creationFixture.ts";

describe("dossier scientific and relation validation", () => {
  it("rejects wind farm values outside the wind mortality branch", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, eolien_turbines_count: 4 },
      }),
    ).toThrow();
  });
  it("requires the wind mortality context when updating wind farm fields", () => {
    expect(() => parseDossierUpdate({ columns: { eolien_turbines_count: 4 } })).toThrow();
    expect(
      parseDossierUpdate({
        columns: {
          main_activite: "Production énergie renouvelable - Éolien -  Suivi mortalité",
          eolien_turbines_count: 4,
        },
      }).columns,
    ).toMatchObject({ eolien_turbines_count: 4 });
  });
  it("rejects an operation end date before its start date", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          intervention_start_date: "2026-09-10",
          intervention_end_date: "2026-09-01",
        },
      }),
    ).toThrow();
  });
  it("rejects an invalid operation period update", () => {
    expect(() =>
      parseDossierUpdate({
        columns: { intervention_start_date: "2026-09-10", intervention_end_date: "2026-09-01" },
      }),
    ).toThrow();
    expect(() => parseDossierUpdate({ columns: { intervention_duration: 0 } })).toThrow();
  });
  it("rejects wind monitoring values outside the wind mortality branch", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, eolien_monitoring_visits_count: 3 },
      }),
    ).toThrow();
  });
  it("rejects carcass and scientific method values outside their branches", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, eolien_carcass_collection_method: "Collecte" },
      }),
    ).toThrow();
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, scientifique_capture_mode: ["Manuelle"] },
      }),
    ).toThrow();
  });
  it("requires a compensation count for swallow nest destruction", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          main_activite:
            "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
          type: "Hirondelle",
          dossier_oiseau_simple_destroyed_nids_count: 3,
          dossier_oiseau_simple_compensated_nids_count: null,
        },
      }),
    ).toThrow();
  });
  it("rejects section 7 values when their conditional fields are hidden", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          request_context: dossierRequestContextOptions[1],
          no_other_satisfactory_solution_justification: "Valeur masquée",
          motif_derogation: null,
          motif_derogation_justification: null,
        },
      }),
    ).toThrow();
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          scientifique_demande_type: ["Prélèvement de matériel biologique"],
        },
      }),
    ).toThrow();
  });
  it("rejects a request context for activities where DN hides it", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, main_activite: "Demande à caractère scientifique" },
      }),
    ).toThrow();
  });
  it("rejects an activity-specific dossier type for another activity", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, type: "Hirondelle" },
      }),
    ).toThrow();
  });
  it("rejects applicant data that differs from its identity", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        relations: {
          ...relations,
          demandeur_personne_physique: {
            ...relations.demandeur_personne_physique,
            last_name: "Durand",
          },
        },
      }),
    ).toThrow();
  });
  it("accepts a physical applicant without a duplicated identity name", () => {
    const unnamedRelations = {
      ...relations,
      demandeur_personne_physique: {
        ...relations.demandeur_personne_physique,
        last_name: "",
        first_names: "",
      },
      identites: [{ ...relations.identites[0], last_name: "", first_names: "" }],
    };
    expect(parseDossierCreation({ ...validCreation, relations: unnamedRelations })).toMatchObject({
      relations: { demandeur_type: "personne_physique" },
    });
  });
  it("accepts an unnamed representative for a legal applicant", () => {
    const legalRelations = {
      groupe_instructeurs: "groupe-1",
      demandeur_type: "personne_morale",
      demandeur_personne_physique: null,
      demandeur_personne_morale: {
        siret: "12345678901234",
        legal_name: null,
        address: null,
        postal_code: null,
        department: null,
        region: null,
      },
      identites: [
        {
          type: "representant",
          last_name: "",
          first_names: "",
          email: null,
          phone: null,
          role: null,
        },
      ],
    };
    expect(parseDossierCreation({ ...validCreation, relations: legalRelations })).toMatchObject({
      relations: { demandeur_type: "personne_morale" },
    });
  });
});
