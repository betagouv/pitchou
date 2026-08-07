import { describe, expect, it } from "vitest";
import { dossierRequestContextOptions } from "@pitchou/common/dossierFormOptions.ts";
import {
  buildCreationPayload,
  createDossierCreationModel,
  showsRequestContext,
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
    expect(buildCreationPayload(model).relations.demandeur_personne_physique).toMatchObject({
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
      departments: ["75"],
      communes: [],
      regions: [],
    });
    model.locationScope = "regions";
    model.locationRegions = ["Île-de-France"];
    expect(buildCreationPayload(model).columns).toMatchObject({
      departments: [],
      communes: [],
      regions: ["Île-de-France"],
    });
    model.locationScope = "france";
    expect(buildCreationPayload(model).columns).toMatchObject({
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
});
