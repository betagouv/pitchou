import { render } from "svelte/server";
import { describe, expect, it } from "vitest";

import DossierCreationProjectSection from "./DossierCreationProjectSection.svelte";
import { createDossierCreationModel } from "./dossierCreationModel.ts";
import {
  ACTIVITE_CODE_BY_LABEL_FIXTURE,
  ACTIVITES_FIXTURE,
  setModelActivite,
} from "./dossierCreationModel/activiteFixture.ts";

describe("dossier creation project section", () => {
  it("uses the shared select for the main activity", () => {
    const { body } = render(DossierCreationProjectSection, {
      props: {
        model: createDossierCreationModel(),
        activites: ACTIVITES_FIXTURE,
        activiteCodeByLabel: ACTIVITE_CODE_BY_LABEL_FIXTURE,
      },
    });

    expect(body).toContain('id="main-activite"');
    expect(body).toContain('aria-haspopup="listbox"');
    expect(body).toContain("Sélectionner une activité");
  });

  it("shows the restoration question and accompaniment details conditionally", () => {
    const model = createDossierCreationModel();
    setModelActivite(
      model,
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
    );
    model.requestContext = "Vous souhaitez bénéficier d'un accompagnement amont";

    const { body } = render(DossierCreationProjectSection, {
      props: {
        model,
        activites: ACTIVITES_FIXTURE,
        activiteCodeByLabel: ACTIVITE_CODE_BY_LABEL_FIXTURE,
      },
    });

    expect(body).toContain('id="restauration-demande-1"');
    expect(body).toContain('id="restauration-demande-2"');
    expect(body).not.toContain('id="transport-demande-1"');
    expect(body).toContain('id="request-context-1"');
    expect(body).toContain('id="request-context-2"');
    expect(body).toContain('id="request-context-3"');
    expect(body).not.toContain('id="request-context"');
    expect(body).not.toContain('id="restauration-demande"');
    expect(body).toContain('id="accompaniment-need"');

    expect(body.indexOf('id="request-context-1"')).toBeLessThan(
      body.indexOf('id="restauration-demande-1"'),
    );
  });

  it("hides the request context for scientific projects", () => {
    const model = createDossierCreationModel();
    setModelActivite(model, "Demande à caractère scientifique");

    const { body } = render(DossierCreationProjectSection, {
      props: {
        model,
        activites: ACTIVITES_FIXTURE,
        activiteCodeByLabel: ACTIVITE_CODE_BY_LABEL_FIXTURE,
      },
    });

    expect(body).not.toContain('id="request-context-1"');
  });

  it("uses radios for the transport-specific question", () => {
    const model = createDossierCreationModel();
    setModelActivite(model, "Infrastructures de transport ferroviaire");

    const { body } = render(DossierCreationProjectSection, {
      props: {
        model,
        activites: ACTIVITES_FIXTURE,
        activiteCodeByLabel: ACTIVITE_CODE_BY_LABEL_FIXTURE,
      },
    });

    expect(body).toContain('id="transport-demande-1"');
    expect(body).toContain('id="transport-demande-2"');
    expect(body).not.toContain('id="restauration-demande-1"');
  });
});
