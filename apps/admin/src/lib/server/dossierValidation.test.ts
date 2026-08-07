import { describe, expect, it } from "vitest";

import {
  especesPriseDetentionLimiteeTypeOptions,
  dossierRequestContextOptions,
  motifDerogationOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";

import { parseDossierCreation, parseDossierUpdate } from "./dossierValidation.ts";

const relations = {
  groupe_instructeurs: "groupe-1",
  demandeur_type: "personne_physique",
  demandeur_personne_physique: {
    last_name: "Martin",
    first_names: "Camille",
    email: null,
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
      email: null,
      phone: null,
      role: null,
    },
  ],
};

const validCreation = {
  name: "Projet test",
  depot_date: "2026-08-01",
  phase: "Accompagnement amont",
  relations,
  columns: {
    urgent_contact_phone: "0612345678",
    description: "Description synthétique",
    linked_to_ae_regime: "unknown",
    ae_procedures: null,
    ae_other_procedure: null,
    especes_prise_detention_limitee_type: null,
    scientifique_demande_purposes: null,
    scientifique_previous_assessment: null,
    scientifique_mortality_measures_taken: null,
    scientifique_mortality_measures_details: null,
    dossier_oiseau_simple_destroyed_nids_count: null,
    intervention_start_date: "2026-08-01",
    intervention_end_date: "2026-08-31",
    commissioning_date: null,
    intervention_duration: null,
    main_activite: "Carrières",
    type: null,
    request_context: dossierRequestContextOptions[2],
    accompaniment_need: null,
    location_scope: "france",
    primary_department: "01",
    communes: [],
    departments: [],
    regions: [],
    no_other_satisfactory_solution_justification: "Aucune autre solution satisfaisante",
    motif_derogation: motifDerogationOptions[0],
    motif_derogation_justification: "Le projet répond à une RIIPM",
    scientifique_demande_type: null,
  },
};

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
    ).toMatchObject({
      eolien_turbines_count: 4,
    });
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
        columns: {
          intervention_start_date: "2026-09-10",
          intervention_end_date: "2026-09-01",
        },
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
        columns: {
          ...validCreation.columns,
          main_activite: "Demande à caractère scientifique",
        },
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
