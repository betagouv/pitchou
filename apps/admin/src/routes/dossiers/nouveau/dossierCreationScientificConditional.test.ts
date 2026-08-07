import { describe, expect, it } from "vitest";
import {
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  motifDerogationOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import {
  buildCreationPayload,
  createDossierCreationModel,
  showsCompleteDossierFiles,
  showsNoDerogationArgumentFiles,
} from "./dossierCreationModel.ts";

describe("scientific dossier creation conditions", () => {
  it("maps wind monitoring, carcass analysis and scientific methods", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Production énergie renouvelable - Éolien -  Suivi mortalité";
    model.scientifiqueSuiviProtocolDescription = "Protocole de suivi";
    model.eolienMonitoredTurbinesCount = 5;
    model.eolienFieldInventoryPeriod = "Mars à octobre";
    model.eolienMonitoringVisitsCount = 20;
    model.eolienWeeklyMonitoringVisitsCount = 2;
    model.eolienMortalityActions = [eolienMortalityActionOptions[1]];
    model.eolienCarcassCollectionMethod = "Collecte quotidienne";
    model.eolienCarcassPreservationMethod = "Conservation réfrigérée";
    model.eolienCarcassExaminationAddress = "11 rue Réaumur, Paris";
    expect(buildCreationPayload(model).columns).toMatchObject({
      scientifique_suivi_protocol_description: "Protocole de suivi",
      eolien_monitored_turbines_count: 5,
      eolien_field_inventory_period: "Mars à octobre",
      eolien_monitoring_visits_count: 20,
      eolien_weekly_monitoring_visits_count: 2,
      eolien_carcass_collection_method: "Collecte quotidienne",
      eolien_carcass_preservation_method: "Conservation réfrigérée",
      eolien_carcass_examination_address: "11 rue Réaumur, Paris",
    });
    model.mainActivite = "Carrières";
    expect(buildCreationPayload(model).columns).toMatchObject({
      scientifique_suivi_protocol_description: null,
      eolien_monitored_turbines_count: null,
      eolien_field_inventory_period: null,
      eolien_monitoring_visits_count: null,
      eolien_weekly_monitoring_visits_count: null,
      eolien_mortality_actions: null,
    });
    model.mainActivite = "Demande à caractère scientifique";
    model.motifDerogation = motifDerogationOptions[4];
    model.scientifiqueDemandeType = [...scientifiqueDemandeTypeOptions.slice(0, 3)];
    model.scientifiqueCaptureModes = ["Manuelle", "Autre moyen de capture (préciser)"];
    model.scientifiqueOtherCaptureMode = "Piège adapté";
    model.scientifiqueUsesLightSources = "oui";
    model.scientifiqueLightSourceConditions = "Lampe frontale";
    model.scientifiqueMarkingConditions = "Marquage temporaire";
    model.scientifiqueTransportConditions = "Transport réfrigéré";
    expect(buildCreationPayload(model).columns).toMatchObject({
      scientifique_capture_mode: ["Manuelle", "Piège adapté"],
      scientifique_light_source_conditions: "Lampe frontale",
      scientifique_marking_conditions: "Marquage temporaire",
      scientifique_transport_conditions: "Transport réfrigéré",
    });
  });

  it("maps intervenants, compensation and final attachment conditions", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Demande à caractère scientifique";
    model.motifDerogation = motifDerogationOptions[4];
    model.scientifiqueIntervenants = [
      { nom_complet: "Camille Martin", qualification: "Écologue", cvFiles: [] },
    ];
    model.scientifiqueOtherIntervenantsDetails = "Participation de bénévoles";
    expect(buildCreationPayload(model).columns).toMatchObject({
      scientifique_intervenants: [{ nom_complet: "Camille Martin", qualification: "Écologue" }],
      scientifique_other_intervenants_details: "Participation de bénévoles",
    });
    model.mainActivite =
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art";
    model.activiteDetail = "Destruction de nids d'Hirondelles";
    model.compensatedNidsCount = 4;
    expect(buildCreationPayload(model).columns).toMatchObject({
      scientifique_intervenants: null,
      scientifique_other_intervenants_details: null,
      dossier_oiseau_simple_compensated_nids_count: 4,
    });
    model.mainActivite = "Carrières";
    model.requestContext = dossierRequestContextOptions[1];
    expect(showsNoDerogationArgumentFiles(model)).toBe(true);
    expect(showsCompleteDossierFiles(model)).toBe(false);
    model.requestContext = dossierRequestContextOptions[2];
    model.motifDerogation = motifDerogationOptions[0];
    expect(showsNoDerogationArgumentFiles(model)).toBe(false);
    expect(showsCompleteDossierFiles(model)).toBe(true);
    model.motifDerogation = motifDerogationOptions[4];
    expect(showsCompleteDossierFiles(model)).toBe(false);
  });
});
