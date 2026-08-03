import { render } from "svelte/server";
import { expect, test } from "vitest";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import DossierNativeIntakeForm from "./DossierNativeIntakeForm.svelte";

test("renders the completed intake form for a native dossier", () => {
  const detail: AdminDossierDetail = {
    dossier: {
      id: 1,
      name: "Dossier test",
      demarche_numerique_number: null,
      demarche_number: null,
      depot_date: "2026-08-03",
    },
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
    groupe: { id: "groupe-1", name: "Groupe test" },
    identites: [],
    evenementsPhase: [],
    piecesJointes: [],
    especesImpactees: null,
  };

  const body = render(DossierNativeIntakeForm, {
    props: {
      detail,
      onSaved: () => undefined,
      onFilesChanged: async () => undefined,
    },
  }).body;

  expect(body).toContain("1. Information à consulter avant de démarrer");
  expect(body).toContain("8.5. Pièces jointes");
  expect(body).toContain("Enregistrer");
  expect(body).not.toContain("brouillon");
  expect(body).not.toContain("Affectation dans Pitchou");
  expect(body).not.toContain("Informations complémentaires Pitchou");
  expect(body).not.toContain("Fichiers déjà enregistrés");
});
