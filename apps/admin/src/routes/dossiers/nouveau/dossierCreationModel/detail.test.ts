import { describe, expect, it } from "vitest";
import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
import {
  buildCreationPayload,
  createDossierCreationModel,
  createDossierCreationModelFromDetail,
  hasLegalSiretChanged,
  mergeDossierRelationsForEdit,
} from "../dossierCreationModel.ts";
import { ACTIVITE_CODE_BY_LABEL_FIXTURE } from "./activiteFixture.ts";

function detail(dossier: AdminDossierDetail["dossier"]): AdminDossierDetail {
  return {
    dossier,
    source: "pitchou",
    managedByDn: false,
    phase: "Accompagnement amont",
    demandeur_personne_physique: null,
    demandeur_personne_morale: null,
    groupe: { id: "groupe-1", name: "Groupe test" },
    identites: [],
    evenementsPhase: [],
    piecesJointes: [],
    especesImpactees: null,
  };
}

describe("dossier creation detail", () => {
  it("hydrates the shared intake form from a native dossier", () => {
    const source = detail({
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
    });
    source.demandeur_personne_physique = {
      last_name: "Martin",
      first_names: "Camille",
      email: null,
      address: "1 rue des Lilas, Lyon",
      phone: "0611223344",
      role: "Écologue",
    };
    source.identites = [
      {
        type: "demandeur",
        last_name: "Martin",
        first_names: "Camille",
        email: "camille@example.org",
        phone: "0611223344",
        role: "Écologue",
      },
    ];
    const model = createDossierCreationModelFromDetail(source, ACTIVITE_CODE_BY_LABEL_FIXTURE);
    expect(model).toMatchObject({
      name: "Suivi éolien",
      depotDate: "2026-08-03",
      urgentContactPhone: "0612345678",
      demandeurType: "personne_physique",
      physicalLastName: "Martin",
      contactEmail: "camille@example.org",
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
  it("keeps or resets company details explicitly when the SIRET changes", () => {
    const source = detail({
      id: 42,
      name: "Projet entreprise",
      demarche_numerique_number: null,
      demarche_number: null,
      depot_date: "2026-08-03",
    });
    source.demandeur_personne_morale = {
      siret: "12345678901234",
      legal_name: "Entreprise actuelle",
      address: "1 rue actuelle",
      postal_code: "75001",
      department: "75",
      region: "Île-de-France",
    };
    const model = createDossierCreationModelFromDetail(source, ACTIVITE_CODE_BY_LABEL_FIXTURE);
    model.legalSiret = "98765432109876";
    const relations = buildCreationPayload(model).relations;
    expect(hasLegalSiretChanged(source, model.legalSiret)).toBe(true);
    expect(
      mergeDossierRelationsForEdit(relations, source, "keep").demandeur_personne_morale,
    ).toMatchObject({
      siret: "98765432109876",
      legal_name: "Entreprise actuelle",
      address: "1 rue actuelle",
    });
    expect(
      mergeDossierRelationsForEdit(relations, source, "reset").demandeur_personne_morale,
    ).toMatchObject({ siret: "98765432109876", legal_name: null, address: null });
  });
  it("builds nullable columns for an incomplete dossier", () => {
    expect(buildCreationPayload(createDossierCreationModel()).columns).toMatchObject({
      main_activite: null,
      request_context: null,
      location_scope: null,
    });
  });
});
