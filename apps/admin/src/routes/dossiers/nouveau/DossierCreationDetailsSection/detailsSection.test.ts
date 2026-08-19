import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import {
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  motifDerogationOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import DossierCreationDetailsSection from "./DossierCreationDetailsSection.svelte";
import { createDossierCreationModel } from "../dossierCreationModel.ts";
import { setModelActivite } from "../dossierCreationModel/activiteFixture.ts";

describe("dossier creation details section", () => {
  it("renders section 8 fields according to their DN conditions", () => {
    const model = createDossierCreationModel();
    const baseBody = render(DossierCreationDetailsSection, { props: { model } }).body;
    expect(baseBody).toContain("8. Détails du projet");
    expect(baseBody).toContain('id="project-description"');
    expect(baseBody).toContain('id="ae-regime-unknown"');
    expect(baseBody).not.toContain('id="ae-procedure-0"');
    expect(baseBody).toContain("8.5. Pièces jointes");
    expect(baseBody).toContain('id="supplemental-files"');
    expect(baseBody.match(/<input[^>]*id="supplemental-files"[^>]*>/)?.[0]).not.toContain(
      "required",
    );
    expect(baseBody).not.toContain('id="complete-dossier-files"');
    expect(baseBody).not.toContain('id="no-derogation-argument-files"');
    model.aeRegime = "oui";
    model.aeProcedures = ["Autre"];
    model.motifDerogation = motifDerogationOptions[4];
    const conditionalBody = render(DossierCreationDetailsSection, { props: { model } }).body;
    expect(conditionalBody).toContain('id="ae-procedure-0"');
    expect(conditionalBody).toContain('id="ae-other-procedure"');
    expect(conditionalBody).not.toContain('id="limited-specimen-0"');
    expect(conditionalBody).toContain('id="previous-assessment-oui"');
    model.motifDerogation = motifDerogationOptions[6];
    expect(render(DossierCreationDetailsSection, { props: { model } }).body).toContain(
      'id="limited-specimen-0"',
    );
    setModelActivite(model, "Production énergie renouvelable - Éolien -  Suivi mortalité");
    model.motifDerogation = motifDerogationOptions[4];
    const windBody = render(DossierCreationDetailsSection, { props: { model } }).body;
    expect(windBody).toContain("8.1. Description du parc éolien concerné");
    expect(windBody).toContain('id="eolien-commissioning-year"');
    expect(windBody).toContain('id="eolien-ground-clearance"');
    expect(windBody).toContain('id="wind-farm-plan-files"');
    expect(windBody).toContain("8.3. Modalités de l'opération");
    expect(windBody).toContain('id="scientific-protocol-description"');
    expect(windBody).toContain('id="eolien-monitored-turbines-count"');
    expect(windBody).toContain('id="eolien-protocol-files"');
    expect(windBody).toContain('id="eolien-mortality-action-0"');
    expect(windBody).toContain("8.4. Personnes amenées à intervenir");
    expect(windBody).toContain('id="intervenant-name-0"');
    expect(windBody).toContain('id="intervenant-cv-0"');
    model.eolienMortalityActions = [eolienMortalityActionOptions[1]];
    const carcassBody = render(DossierCreationDetailsSection, { props: { model } }).body;
    expect(carcassBody).toContain("8.3.1. Précisions sur le transport des cadavres");
    expect(carcassBody).toContain('id="carcass-collection-method"');
    expect(carcassBody).toContain('id="carcass-examination-address"');
    setModelActivite(model, "Demande à caractère scientifique");
    model.motifDerogation = motifDerogationOptions[4];
    model.scientifiqueDemandeType = [...scientifiqueDemandeTypeOptions.slice(0, 3)];
    const methodsBody = render(DossierCreationDetailsSection, { props: { model } }).body;
    expect(methodsBody).toContain('id="scientific-capture-mode-0"');
    expect(methodsBody).toContain('id="scientific-light-sources-oui"');
    expect(methodsBody).toContain('id="scientific-marking-conditions"');
    expect(methodsBody).toContain('id="scientific-transport-conditions"');
    setModelActivite(model, "Carrières");
    model.requestContext = dossierRequestContextOptions[1];
    const reviewBody = render(DossierCreationDetailsSection, { props: { model } }).body;
    expect(reviewBody).toContain("8.2. Période de l'opération");
    expect(reviewBody).toContain('id="intervention-start-date"');
    expect(reviewBody).not.toContain('id="intervention-duration"');
    expect(reviewBody).toContain('id="no-derogation-argument-files"');
    model.requestContext = dossierRequestContextOptions[2];
    model.motifDerogation = motifDerogationOptions[0];
    const derogationBody = render(DossierCreationDetailsSection, { props: { model } }).body;
    expect(derogationBody).toContain('id="intervention-duration"');
    expect(derogationBody).toContain('id="complete-dossier-files"');
    setModelActivite(
      model,
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
    );
    model.activiteDetail = "Destruction de nids d'Hirondelles";
    expect(render(DossierCreationDetailsSection, { props: { model } }).body).toContain(
      'id="compensated-nids-count"',
    );
  });
});
