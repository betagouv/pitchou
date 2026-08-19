import { render } from "svelte/server";
import { describe, expect, it } from "vitest";

import { motifDerogationOptions } from "@pitchou/common/dossierFormOptions.ts";

import DossierCreationDemandeurSection from "./DossierCreationDemandeurSection.svelte";
import DossierCreationLocationSection from "./DossierCreationLocationSection.svelte";
import DossierCreationJustificationSection from "./DossierCreationJustificationSection.svelte";
import DossierCreationMapSection from "./DossierCreationMapSection.svelte";
import DossierCreationProjectSection from "./DossierCreationProjectSection.svelte";
import DossierCreationSpeciesSection from "./DossierCreationSpeciesSection.svelte";
import { createDossierCreationModel } from "./dossierCreationModel.ts";

describe("dossier creation sections", () => {
  it("uses a searchable main activity combobox", () => {
    const { body } = render(DossierCreationProjectSection, {
      props: { model: createDossierCreationModel() },
    });

    expect(body).toContain('id="main-activite"');
    expect(body).toContain('aria-haspopup="listbox"');
    expect(body).toContain("Sélectionnez ou commencez à saisir");
  });

  it("shows the restoration question and accompaniment details conditionally", () => {
    const model = createDossierCreationModel();
    model.mainActivite =
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art";
    model.requestContext = "Vous souhaitez bénéficier d'un accompagnement amont";

    const { body } = render(DossierCreationProjectSection, { props: { model } });

    expect(body).toContain('id="restauration-demande-1"');
    expect(body).toContain('id="restauration-demande-2"');
    expect(body).not.toContain('id="transport-demande-1"');
    expect(body).toContain('id="request-context-1"');
    expect(body).toContain('id="request-context-2"');
    expect(body).toContain('id="request-context-3"');
    // Radios replaced single dropdown controls, so no element carries these ids.
    expect(body).not.toContain('id="request-context"');
    expect(body).not.toContain('id="restauration-demande"');
    expect(body).toContain('id="accompaniment-need"');

    expect(body.indexOf('id="request-context-1"')).toBeLessThan(
      body.indexOf('id="restauration-demande-1"'),
    );
  });

  it("hides the request context for scientific projects", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Demande à caractère scientifique";

    const { body } = render(DossierCreationProjectSection, { props: { model } });

    expect(body).not.toContain('id="request-context-1"');
  });

  it("uses radios for the transport-specific question", () => {
    const model = createDossierCreationModel();
    model.mainActivite = "Infrastructures de transport ferroviaire";

    const { body } = render(DossierCreationProjectSection, { props: { model } });

    expect(body).toContain('id="transport-demande-1"');
    expect(body).toContain('id="transport-demande-2"');
    expect(body).not.toContain('id="restauration-demande-1"');
  });

  it("shows only the fields matching the demandeur type", () => {
    const physical = createDossierCreationModel();
    physical.demandeurType = "personne_physique";
    const physicalBody = render(DossierCreationDemandeurSection, {
      props: { model: physical },
    }).body;

    const legal = createDossierCreationModel();
    legal.demandeurType = "personne_morale";
    const legalBody = render(DossierCreationDemandeurSection, { props: { model: legal } }).body;

    expect(physicalBody).toContain('id="physical-qualification"');
    expect(physicalBody).toContain('id="physical-address-search"');
    expect(physicalBody).toContain('id="physical-manual-address"');
    expect(physicalBody).not.toContain('id="physical-last-name"');
    expect(physicalBody).not.toContain('id="physical-first-names"');
    expect(physicalBody).not.toContain('id="legal-siret"');

    physical.physicalManualAddress = true;
    const manualAddressBody = render(DossierCreationDemandeurSection, {
      props: { model: physical },
    }).body;
    expect(manualAddressBody).toContain('id="physical-country"');
    expect(manualAddressBody).toContain('id="physical-street"');
    expect(manualAddressBody).toContain('id="physical-city"');

    expect(legalBody).toContain('id="legal-siret"');
    expect(legalBody).toContain('id="representative-role"');
    expect(legalBody).toContain("Format attendu : 14 chiffres");
    expect(legalBody).toContain("Personne en charge du projet au sein de la personne morale");
    expect(legalBody).not.toContain('id="legal-name"');
    expect(legalBody).not.toContain('id="physical-address-search"');

    legal.legalSiret = "98765432109876";
    const changedSiretBody = render(DossierCreationDemandeurSection, {
      props: {
        model: legal,
        originalLegalSiret: "12345678901234",
        companyDetailsChoice: "",
      },
    }).body;
    expect(changedSiretBody).toContain("Vous modifiez le numéro de SIRET");
    expect(changedSiretBody).toContain('id="company-details-keep"');
    expect(changedSiretBody).toContain('id="company-details-reset"');
  });

  it("stacks the demandeur choices and contact fields like DN", () => {
    const { body } = render(DossierCreationDemandeurSection, {
      props: { model: createDossierCreationModel() },
    });

    expect(body).toContain('id="demandeur-physical"');
    expect(body).toContain('id="demandeur-legal"');
    expect(body).not.toContain("fr-fieldset__element--inline");
    expect(body).toContain("lg:w-1/3");
    expect(body).toContain("lg:w-2/3");
  });

  it("shows the section 4 location fields conditionally", () => {
    const model = createDossierCreationModel();
    const baseBody = render(DossierCreationLocationSection, { props: { model } }).body;
    expect(baseBody).toContain("4. Localisation du projet");
    expect(baseBody).toContain('id="location-primary-department"');
    expect(baseBody).toContain('id="location-scope-communes"');
    expect(baseBody).toContain('id="location-scope-departements"');
    expect(baseBody).toContain('id="location-scope-regions"');
    expect(baseBody).toContain('id="location-scope-france"');
    expect(baseBody).not.toContain('id="creation-commune-search"');

    model.locationScope = "communes";
    expect(render(DossierCreationLocationSection, { props: { model } }).body).toContain(
      'id="creation-commune-search"',
    );
    model.locationScope = "departements";
    expect(render(DossierCreationLocationSection, { props: { model } }).body).toContain(
      'id="creation-location-departments"',
    );
    model.locationScope = "regions";
    expect(render(DossierCreationLocationSection, { props: { model } }).body).toContain(
      'id="creation-location-regions"',
    );
  });

  it("renders the section 5 map tools and import control", () => {
    const { body } = render(DossierCreationMapSection, {
      props: { model: createDossierCreationModel() },
    });

    expect(body).toContain("5. Cartographie du projet");
    expect(body).toContain("Cartographie de l'emprise du projet");
    expect(body).toContain('id="creation-project-map"');
    expect(body).toContain("Ajouter un fichier GPX ou KML");
    expect(body).toContain('id="project-map-address"');
    expect(body).toContain('id="project-map-coordinates"');
  });

  it("renders the required section 6 species spreadsheet upload", () => {
    const { body } = render(DossierCreationSpeciesSection, {
      props: { model: createDossierCreationModel() },
    });

    expect(body).toContain("6. Espèces concernées par la dérogation");
    expect(body).toContain("Le remplissage de cette section est indispensable");
    expect(body).toContain("https://pitchou.beta.gouv.fr/saisie-especes");
    expect(body).toContain('id="species-file"');
    expect(body).toContain("65 Mo");
  });

  it("renders section 7 and its scientific choices conditionally", () => {
    const model = createDossierCreationModel();
    const generalBody = render(DossierCreationJustificationSection, { props: { model } }).body;
    expect(generalBody).toContain("7. Justifications de la demande de dérogation");
    expect(generalBody).toContain('id="no-other-solution-justification"');
    expect(generalBody).toContain('id="creation-motif-derogation"');
    expect(generalBody).toContain('id="creation-motif-justification"');
    expect(generalBody).not.toContain('id="scientific-request-type-0"');

    model.motifDerogation = motifDerogationOptions[4];
    const scientificBody = render(DossierCreationJustificationSection, { props: { model } }).body;
    expect(scientificBody).toContain("Recherche scientifique - Votre demande concerne");
    expect(scientificBody).toContain('id="scientific-request-type-0"');
  });
});
