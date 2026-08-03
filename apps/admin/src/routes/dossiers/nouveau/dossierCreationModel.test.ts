import { describe, expect, it } from "vitest";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import {
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  motifDerogationOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";

import {
  buildCreationPayload,
  createDossierCreationModel,
  createDossierCreationModelFromDetail,
  motifDerogationGuidance,
  showsSpeciesSection,
  suggestedMotifDerogation,
  showsRequestContext,
  showsCompleteDossierFiles,
  showsNoDerogationArgumentFiles,
} from "./dossierCreationModel.ts";

describe("dossier creation model", () => {
  it("applies the DN rules for displaying the request context", () => {
    expect(showsRequestContext("Carrières")).toBe(true);
    expect(showsRequestContext("Demande à caractère scientifique")).toBe(false);
    expect(showsRequestContext("Desaîrage")).toBe(false);
    expect(showsRequestContext("Pédagogique enseignement")).toBe(false);
    expect(showsRequestContext("Production énergie renouvelable - Éolien -  Suivi mortalité")).toBe(
      false,
    );
  });

  it("builds a physical demandeur and maps the no-derogation context", () => {
    const model = createDossierCreationModel();
    Object.assign(model, {
      name: "Projet test",
      mainActivite: "Carrières",
      requestContext: dossierRequestContextOptions[1],
      urgentContactPhone: "06 12 34 56 78",
      demandeurType: "personne_physique",
      physicalLastName: "Martin",
      physicalFirstNames: "Camille",
      physicalQualification: "Écologue",
      physicalAddress: "1 rue des Lilas, Lyon",
      contactPhone: "0102030405",
      contactEmail: "camille@example.org",
      groupeInstructeurs: "groupe-1",
    } satisfies Partial<typeof model>);

    const payload = buildCreationPayload(model);

    expect(payload.columns).toMatchObject({
      urgent_contact_phone: "06 12 34 56 78",
      main_activite: "Carrières",
      request_context: dossierRequestContextOptions[1],
      accompaniment_need: null,
    });
    expect(payload.columns).not.toHaveProperty("ddep_required");
    expect(payload.relations).toMatchObject({
      demandeur_type: "personne_physique",
      demandeur_personne_physique: {
        last_name: "Martin",
        address: "1 rue des Lilas, Lyon",
        role: "Écologue",
      },
    });
  });

  it("builds the legal representative and maps the activity-specific dossier type", () => {
    const model = createDossierCreationModel();
    Object.assign(model, {
      name: "Travaux sur bâtiment",
      mainActivite:
        "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
      activiteDetail: "Destruction de nids d'Hirondelles",
      requestContext: dossierRequestContextOptions[2],
      urgentContactPhone: "0612345678",
      demandeurType: "personne_morale",
      legalSiret: "123 456 789 01234",
      representativeLastName: "Durand",
      representativeFirstNames: "Lou",
      representativeRole: "Directrice",
      contactEmail: "lou@example.org",
      groupeInstructeurs: "groupe-1",
    } satisfies Partial<typeof model>);

    const payload = buildCreationPayload(model);

    expect(payload.columns).toMatchObject({ type: "Hirondelle" });
    expect(payload.columns).not.toHaveProperty("ddep_required");
    expect(payload.relations.demandeur_personne_morale).toMatchObject({
      siret: "12345678901234",
      legal_name: null,
    });
    expect(payload.relations.identites).toEqual([
      expect.objectContaining({ type: "representant", role: "Directrice" }),
    ]);
  });

  it("builds a physical demandeur without an identity name and formats a manual address", () => {
    const model = createDossierCreationModel();
    Object.assign(model, {
      demandeurType: "personne_physique",
      physicalManualAddress: true,
      physicalStreet: "11 rue Réaumur",
      physicalCity: "Paris 75002",
      groupeInstructeurs: "groupe-1",
    } satisfies Partial<typeof model>);

    const payload = buildCreationPayload(model);

    expect(payload.relations.demandeur_personne_physique).toMatchObject({
      last_name: "",
      first_names: "",
      address: "11 rue Réaumur, Paris 75002, France",
    });

    model.physicalCountry = "Autre pays";
    model.physicalOtherCountry = "Belgique";
    expect(buildCreationPayload(model).relations.demandeur_personne_physique).toMatchObject({
      address: "11 rue Réaumur, Paris 75002, Belgique",
    });
  });

  it("maps the primary department and scoped locations", () => {
    const model = createDossierCreationModel();
    model.primaryDepartment = "01";
    model.locationScope = "communes";
    model.communes = [
      { name: "Bourg-en-Bresse", code: "01053", postalCode: "01000", departmentCode: "01" },
      { name: "Paris", code: "75056", postalCode: "75001", departmentCode: "75" },
    ];

    expect(buildCreationPayload(model).columns).toMatchObject({
      location_scope: "communes",
      primary_department: "01",
      departments: ["01", "75"],
      communes: [
        { name: "Bourg-en-Bresse", code: "01053", postalCode: "01000" },
        { name: "Paris", code: "75056", postalCode: "75001" },
      ],
      regions: [],
    });

    model.locationScope = "departements";
    model.locationDepartments = ["75"];
    expect(buildCreationPayload(model).columns).toMatchObject({
      primary_department: "01",
      departments: ["75"],
      communes: [],
      regions: [],
    });

    model.locationScope = "regions";
    model.locationRegions = ["Île-de-France"];
    expect(buildCreationPayload(model).columns).toMatchObject({
      primary_department: "01",
      departments: [],
      communes: [],
      regions: ["Île-de-France"],
    });

    model.locationScope = "france";
    expect(buildCreationPayload(model).columns).toMatchObject({
      primary_department: "01",
      departments: [],
      communes: [],
      regions: [],
    });
  });

  it("includes the project map in the creation payload", () => {
    const model = createDossierCreationModel();
    model.projectMap = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [2.35, 48.85] },
          properties: { source: "selection_utilisateur" },
        },
      ],
    };

    expect(buildCreationPayload(model).columns?.projet_map).toEqual(model.projectMap);
  });

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

  it("maps section 7 fields into the creation payload", () => {
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
  });

  it("clears hidden section 7 fields from the creation payload", () => {
    const model = createDossierCreationModel();
    model.noOtherSatisfactorySolutionJustification = "Valeur masquée";
    model.motifDerogation = motifDerogationOptions[4];
    model.motifDerogationJustification = "Valeur masquée";
    model.scientifiqueDemandeType = ["Prélèvement de matériel biologique"];
    model.scientifiqueSuiviProtocolDescription = "Protocole masqué";

    expect(buildCreationPayload(model).columns).toMatchObject({
      no_other_satisfactory_solution_justification: null,
      motif_derogation: null,
      motif_derogation_justification: null,
      scientifique_demande_type: null,
      scientifique_suivi_protocol_description: null,
    });
  });

  it("maps section 8 conditional values", () => {
    const model = createDossierCreationModel();
    model.description = "Description";
    model.aeRegime = "oui";
    model.aeProcedures = ["Autorisation ICPE", "Autre"];
    model.aeOtherProcedure = "Procédure locale";

    expect(buildCreationPayload(model).columns).toMatchObject({
      description: "Description",
      linked_to_ae_regime: true,
      ae_procedures: ["Autorisation ICPE", "Autre"],
      ae_other_procedure: "Procédure locale",
      limited_specimen_type: null,
      scientifique_previous_assessment: null,
    });
  });

  it("maps and clears the conditional wind farm details", () => {
    const model = createDossierCreationModel();
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
    model.mainActivite = "Carrières";
    model.requestContext = dossierRequestContextOptions[2];
    model.interventionStartDate = "2026-09-01";
    model.interventionEndDate = "2026-09-30";
    model.commissioningDate = "2026-10-01";
    model.interventionDuration = 2.5;

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
  });

  it("maps and clears the wind monitoring protocol", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Production énergie renouvelable - Éolien -  Suivi mortalité";
    model.scientifiqueSuiviProtocolDescription = "Protocole de suivi";
    model.eolienMonitoredTurbinesCount = 5;
    model.eolienFieldInventoryPeriod = "Mars à octobre";
    model.eolienMonitoringVisitsCount = 20;
    model.eolienWeeklyMonitoringVisitsCount = 2;
    model.eolienMortalityActions = ["Transport des individus blessés vers un centre de soin"];

    expect(buildCreationPayload(model).columns).toMatchObject({
      scientifique_suivi_protocol_description: "Protocole de suivi",
      eolien_monitored_turbines_count: 5,
      eolien_field_inventory_period: "Mars à octobre",
      eolien_monitoring_visits_count: 20,
      eolien_weekly_monitoring_visits_count: 2,
      eolien_mortality_actions: ["Transport des individus blessés vers un centre de soin"],
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
  });

  it("maps carcass analysis and scientific method details conditionally", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Production énergie renouvelable - Éolien -  Suivi mortalité";
    model.eolienMortalityActions = [eolienMortalityActionOptions[1]];
    model.eolienCarcassCollectionMethod = "Collecte quotidienne";
    model.eolienCarcassPreservationMethod = "Conservation réfrigérée";
    model.eolienCarcassExaminationAddress = "11 rue Réaumur, Paris";

    expect(buildCreationPayload(model).columns).toMatchObject({
      eolien_carcass_collection_method: "Collecte quotidienne",
      eolien_carcass_preservation_method: "Conservation réfrigérée",
      eolien_carcass_examination_address: "11 rue Réaumur, Paris",
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

  it("maps intervenants and the conditional compensation count", () => {
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
  });

  it("applies the DN conditions for final attachments", () => {
    const model = createDossierCreationModel();
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

  it("hydrates the shared intake form from a native dossier", () => {
    const detail: AdminDossierDetail = {
      dossier: {
        id: 42,
        name: "Suivi éolien",
        demarche_numerique_number: null,
        demarche_number: null,
        depot_date: "2026-08-03T10:00:00.000Z",
        urgent_contact_phone: "0612345678",
        main_activite: "Production énergie renouvelable - Éolien -  Suivi mortalité",
        description: "Suivi du parc",
        linked_to_ae_regime: false,
        eolien_turbines_count: 8,
        scientifique_previous_assessment: true,
        scientifique_intervenants: [{ nom_complet: "Camille Martin", qualification: "Écologue" }],
      },
      managedByDn: false,
      phase: "Accompagnement amont",
      demandeur_personne_physique: {
        last_name: "Martin",
        first_names: "Camille",
        email: "camille@example.org",
        address: "1 rue des Lilas, Lyon",
        phone: "0611223344",
        role: "Écologue",
      },
      demandeur_personne_morale: null,
      groupe: { id: "groupe-1", name: "Groupe test" },
      identites: [],
      evenementsPhase: [],
      piecesJointes: [],
      especesImpactees: null,
    };

    const model = createDossierCreationModelFromDetail(detail);

    expect(model).toMatchObject({
      name: "Suivi éolien",
      depotDate: "2026-08-03",
      urgentContactPhone: "0612345678",
      demandeurType: "personne_physique",
      physicalLastName: "Martin",
      groupeInstructeurs: "groupe-1",
      eolienTurbinesCount: 8,
      scientifiquePreviousAssessment: "oui",
      scientifiqueIntervenants: [
        { nom_complet: "Camille Martin", qualification: "Écologue", cvFiles: [] },
      ],
    });
    expect(buildCreationPayload(model).columns).toMatchObject({
      main_activite: "Production énergie renouvelable - Éolien -  Suivi mortalité",
      eolien_turbines_count: 8,
    });
  });

  it("builds nullable columns for an incomplete dossier", () => {
    const payload = buildCreationPayload(createDossierCreationModel());
    expect(payload.columns).toMatchObject({
      main_activite: null,
      request_context: null,
      location_scope: null,
    });
  });
});
