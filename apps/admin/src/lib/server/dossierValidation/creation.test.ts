import { describe, expect, it } from "vitest";

import {
  especesPriseDetentionLimiteeTypeOptions,
  dossierRequestContextOptions,
  motifDerogationOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";

import { parseDossierCreation } from "../dossierValidation.ts";
import { validCreation } from "./creationFixture.ts";

describe("parseDossierCreation", () => {
  it("accepts a complete creation payload", () => {
    expect(parseDossierCreation(validCreation)).toMatchObject({
      name: "Projet test",
      columns: { request_context: dossierRequestContextOptions[2] },
    });
  });

  it("requires a valid urgent phone and a main activity", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, urgent_contact_phone: "123" },
      }),
    ).toThrow();
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, main_activite: null },
      }),
    ).toThrow();
  });

  it("requires details for an upstream support request", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          request_context: dossierRequestContextOptions[0],
          accompaniment_need: null,
        },
      }),
    ).toThrow();
  });

  it("requires a location scope and primary department", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, location_scope: null },
      }),
    ).toThrow();
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, primary_department: null },
      }),
    ).toThrow();
  });

  it("requires derogation justifications on derogation paths", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          no_other_satisfactory_solution_justification: null,
        },
      }),
    ).toThrow();
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, motif_derogation: null },
      }),
    ).toThrow();
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: { ...validCreation.columns, motif_derogation_justification: "" },
      }),
    ).toThrow();
  });

  it("requires a scientific request type for the research derogation reason", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          main_activite: "Demande à caractère scientifique",
          request_context: null,
          intervention_start_date: null,
          intervention_end_date: null,
          motif_derogation: motifDerogationOptions[4],
          scientifique_demande_type: [],
        },
      }),
    ).toThrow();
  });

  it("accepts the complete research details branch", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          main_activite: "Demande à caractère scientifique",
          request_context: null,
          intervention_start_date: "2026-08-01",
          intervention_end_date: "2026-08-31",
          motif_derogation: motifDerogationOptions[4],
          scientifique_demande_type: [scientifiqueDemandeTypeOptions[0]],
          scientifique_demande_purposes: [],
          scientifique_previous_assessment: false,
        },
      }),
    ).not.toThrow();
  });

  it("requires operation dates for direct requests", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          main_activite: "Demande à caractère scientifique",
          request_context: null,
          intervention_start_date: null,
          intervention_end_date: null,
          motif_derogation: motifDerogationOptions[4],
          scientifique_demande_type: [scientifiqueDemandeTypeOptions[0]],
          scientifique_demande_purposes: [],
          scientifique_previous_assessment: false,
        },
      }),
    ).toThrow();
  });

  it("requires the specimen type only for the limited-taking reason", () => {
    const columns = {
      ...validCreation.columns,
      motif_derogation: motifDerogationOptions[6],
    };

    expect(() => parseDossierCreation({ ...validCreation, columns })).toThrow();
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...columns,
          especes_prise_detention_limitee_type: especesPriseDetentionLimiteeTypeOptions[0],
        },
      }),
    ).not.toThrow();
  });

  it("requires procedures when the project is subject to environmental authorization", () => {
    expect(() =>
      parseDossierCreation({
        ...validCreation,
        columns: {
          ...validCreation.columns,
          linked_to_ae_regime: true,
          ae_procedures: [],
        },
      }),
    ).toThrow();
  });
});
