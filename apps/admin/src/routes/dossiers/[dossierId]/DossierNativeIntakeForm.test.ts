import { render } from "svelte/server";
import { expect, test, vi } from "vitest";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import DossierNativeIntakeForm from "./DossierNativeIntakeForm.svelte";
import {
  ACTIVITE_CODE_BY_LABEL_FIXTURE,
  ACTIVITES_FIXTURE,
} from "../nouveau/dossierCreationModel/activiteFixture.ts";

function makeDetail(groupe: AdminDossierDetail["groupes"][number] | null): AdminDossierDetail {
  return {
    dossier: {
      id: 1,
      name: "Dossier test",
      demarche_numerique_number: null,
      demarche_number: null,
      depot_date: "2026-08-03",
    },
    source: "pitchou",
    managedByDn: false,
    phase: "Accompagnement amont",
    demandeur_personne_physique: {
      last_name: "",
      first_names: "",
      email: null,
      address: null,
      phone: null,
      role: null,
    },
    demandeur_personne_morale: null,
    groupes: groupe ? [groupe] : [],
    identites: [],
    evenementsPhase: [],
    piecesJointes: [],
    especesImpactees: null,
  };
}

function renderForm(detail: AdminDossierDetail): string {
  return render(DossierNativeIntakeForm, {
    props: {
      detail,
      activites: ACTIVITES_FIXTURE,
      activiteCodeByLabel: ACTIVITE_CODE_BY_LABEL_FIXTURE,
      onSaved: () => undefined,
      onFilesChanged: async () => undefined,
    },
  }).body;
}

test("renders the completed intake form for a native dossier", () => {
  const body = renderForm(makeDetail({ id: "groupe-1", name: "Groupe test" }));

  expect(body).toContain("1. Informations générales");
  expect(body).toContain("8.5. Pièces jointes");
  expect(body).toContain('id="dossier-admin-edit-form"');
  expect(body).not.toContain("brouillon");
  expect(body).not.toContain("Affectation dans Pitchou");
  expect(body).not.toContain("Informations complémentaires Pitchou");
  expect(body).not.toContain("Fichiers déjà enregistrés");
});

test("uses the primary department when no group currently owns the dossier", () => {
  const body = renderForm(makeDetail(null));

  expect(body).toContain("location-primary-department");
  expect(body).not.toContain('id="native-dossier-groupe"');
});

vi.mock("$app/state", async () => ({
  page: {
    data: {
      user: { permissions: (await import("@pitchou/types/permissions.ts")).BUNDLES.administrateur },
    },
  },
}));
