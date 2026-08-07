import { render } from "svelte/server";
import { describe, expect, it } from "vitest";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import DossierAdminForm from "./DossierAdminForm.svelte";

function detail(
  ecologicalInventoryCompleted: boolean | null,
  especesPresentInInfluenceArea: boolean | null = null,
  locationScope: string | null = null,
): AdminDossierDetail {
  return {
    dossier: {
      id: 1,
      name: "Projet test",
      demarche_numerique_number: null,
      demarche_number: null,
      depot_date: "2026-07-30",
      ecological_inventory_completed: ecologicalInventoryCompleted,
      especes_present_in_influence_area: especesPresentInInfluenceArea,
      location_scope: locationScope,
    },
    managedByDn: false,
    phase: "construction",
    demandeur_personne_physique: {
      last_name: "Martin",
      first_names: "Camille",
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
}

function formBody(
  ecologicalInventoryCompleted: boolean | null,
  especesPresentInInfluenceArea: boolean | null = null,
  locationScope: string | null = null,
) {
  return render(DossierAdminForm, {
    props: {
      detail: detail(ecologicalInventoryCompleted, especesPresentInInfluenceArea, locationScope),
      onSaved: () => undefined,
      onFilesChanged: async () => undefined,
    },
  }).body;
}

describe("DossierAdminForm", () => {
  it("keeps the short DN path while the ecological inventory is not complete", () => {
    const body = formBody(null);

    expect(body).not.toContain("edit-especes-influence-area");
    expect(body).not.toContain('aria-label="Porteur de projet"');
    expect(body).toContain("0.1. Période de l'opération");
    expect(body).toContain("0.2. Pièces jointes");
  });

  it("reveals the residual-risk question only when protected species are present", () => {
    expect(formBody(true, false)).toContain("edit-especes-influence-area");
    expect(formBody(true, false)).not.toContain("edit-risk-despite-erc");
    expect(formBody(true, true)).toContain("edit-risk-despite-erc");
  });

  it("uses the DN section order for the complete path", () => {
    const body = formBody(true, true);
    const sections = [
      'aria-label="Porteur de projet"',
      'aria-label="Description du projet"',
      "3. Espèces concernées par la dérogation",
      'aria-label="Dérogation"',
      'id="project-details-title"',
    ];

    const positions = sections.map((section) => body.indexOf(section));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it("shows only the location input matching the selected geographic level", () => {
    const communes = formBody(true, true, "communes");
    const regions = formBody(true, true, "regions");

    expect(communes).toContain('id="edit-commune-search"');
    expect(communes).not.toContain('id="edit-regions"');
    expect(regions).toContain('id="edit-regions"');
    expect(regions).not.toContain('id="edit-commune-search"');
  });
});
