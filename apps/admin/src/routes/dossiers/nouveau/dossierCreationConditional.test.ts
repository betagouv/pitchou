import { describe, expect, it } from "vitest";
import {
  dossierRequestContextOptions,
  motifDerogationOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import {
  buildCreationPayload,
  createDossierCreationModel,
  motifDerogationGuidance,
  showsOperationDates,
  showsSpeciesSection,
  suggestedMotifDerogation,
} from "./dossierCreationModel.ts";

describe("dossier creation conditional fields", () => {
  it("shows the species file section for every DN derogation path", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Carrières";
    model.requestContext = dossierRequestContextOptions[0];
    expect(showsSpeciesSection(model)).toBe(false);
    model.requestContext = dossierRequestContextOptions[2];
    expect(showsSpeciesSection(model)).toBe(true);
    model.mainActivite = "Demande à caractère scientifique";
    model.requestContext = "";
    expect(showsSpeciesSection(model)).toBe(true);
  });
  it("suggests the DN derogation reason from the main activity", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Carrières";
    expect(suggestedMotifDerogation(model)).toBe(motifDerogationOptions[0]);
    model.mainActivite = "Demande à caractère scientifique";
    expect(suggestedMotifDerogation(model)).toBe(motifDerogationOptions[4]);
    model.mainActivite = "Desaîrage";
    expect(suggestedMotifDerogation(model)).toBe(motifDerogationOptions[6]);
    expect(motifDerogationGuidance(model)).toContain(
      'Vous avez renseigné comme objectif principal "Desaîrage"',
    );
  });
  it("maps and clears section 7 fields", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Demande à caractère scientifique";
    model.noOtherSatisfactorySolutionJustification = "Aucune alternative";
    model.motifDerogation = motifDerogationOptions[4];
    model.motifDerogationJustification = "Programme scientifique";
    model.scientifiqueDemandeType = ["Prélèvement de matériel biologique"];
    expect(buildCreationPayload(model).columns).toMatchObject({
      no_other_satisfactory_solution_justification: "Aucune alternative",
      motif_derogation: motifDerogationOptions[4],
      motif_derogation_justification: "Programme scientifique",
      scientifique_demande_type: ["Prélèvement de matériel biologique"],
    });
    model.scientifiqueSuiviProtocolDescription = "Protocole masqué";
    model.mainActivite = "";
    expect(buildCreationPayload(model).columns).toMatchObject({
      no_other_satisfactory_solution_justification: null,
      motif_derogation: null,
      motif_derogation_justification: null,
      scientifique_demande_type: null,
      scientifique_suivi_protocol_description: null,
    });
  });
  it("maps section 8 and wind farm values conditionally", () => {
    const model = createDossierCreationModel();
    model.description = "Description";
    model.aeRegime = "oui";
    model.aeProcedures = ["Autorisation ICPE", "Autre"];
    model.aeOtherProcedure = "Procédure locale";
    model.motifDerogation = motifDerogationOptions[6];
    model.especesPriseDetentionLimiteeType = "Espèces autres que oiseaux";
    expect(buildCreationPayload(model).columns).toMatchObject({
      description: "Description",
      linked_to_ae_regime: true,
      ae_procedures: ["Autorisation ICPE", "Autre"],
      ae_other_procedure: "Procédure locale",
      especes_prise_detention_limitee_type: "Espèces autres que oiseaux",
      scientifique_previous_assessment: null,
    });
    model.mainActivite = "Production énergie renouvelable - Éolien -  Suivi mortalité";
    model.eolienCommissioningYear = 2020;
    model.eolienTurbinesCount = 8;
    model.eolienTipHeight = 180.5;
    expect(buildCreationPayload(model).columns).toMatchObject({
      eolien_commissioning_year: 2020,
      eolien_turbines_count: 8,
      eolien_tip_height: 180.5,
    });
    model.mainActivite = "Carrières";
    expect(buildCreationPayload(model).columns).toMatchObject({
      eolien_commissioning_year: null,
      eolien_turbines_count: null,
      eolien_tip_height: null,
    });
  });
  it("maps the operation period from the request path", () => {
    const model = createDossierCreationModel();
    Object.assign(model, {
      mainActivite: "Carrières",
      requestContext: dossierRequestContextOptions[2],
      interventionStartDate: "2026-09-01",
      interventionEndDate: "2026-09-30",
      commissioningDate: "2026-10-01",
      interventionDuration: 2.5,
    } satisfies Partial<typeof model>);
    expect(buildCreationPayload(model).columns).toMatchObject({
      intervention_start_date: "2026-09-01",
      intervention_end_date: "2026-09-30",
      commissioning_date: "2026-10-01",
      intervention_duration: 2.5,
    });
    model.requestContext = dossierRequestContextOptions[0];
    expect(buildCreationPayload(model).columns).toMatchObject({
      intervention_start_date: null,
      intervention_end_date: null,
      commissioning_date: null,
      intervention_duration: null,
    });
    model.mainActivite = "Demande à caractère scientifique";
    model.requestContext = "";
    expect(showsOperationDates(model)).toBe(true);
    expect(buildCreationPayload(model).columns).toMatchObject({
      intervention_start_date: "2026-09-01",
      intervention_end_date: "2026-09-30",
      commissioning_date: "2026-10-01",
    });
  });
});
