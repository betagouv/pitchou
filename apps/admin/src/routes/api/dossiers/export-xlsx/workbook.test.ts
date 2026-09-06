import { describe, expect, it } from "vitest";
import type {
  AdminAvisExpertExportRow,
  AdminDossierExportRow,
} from "@pitchou/server/database/dossier_admin_list.ts";
import { avisExpertSheetRows, dossiersExportSheets, dossiersSheetRows } from "./workbook.ts";

function makeRow(overrides: Partial<AdminDossierExportRow> = {}): AdminDossierExportRow {
  return {
    id: 42,
    name: "Parc éolien",
    demarche_numerique_number: "123456",
    source: "demarche_numerique",
    depot_date: new Date("2026-03-04T10:00:00.000Z"),
    phase: "Instruction",
    phase_date: new Date("2026-05-20T14:30:00.000Z"),
    demandeur_last_name: null,
    demandeur_first_names: null,
    demandeur_entreprise: "ACME",
    groupe_name: "DREAL Bretagne",
    // A raw label pending review: `withResolvedActivite` keeps it as the displayed label.
    main_activite: "Production d'énergie renouvelable",
    activite_code: "autre",
    activite_label: "Production d'énergie renouvelable",
    primary_department: "35",
    departments: ["35", "22"],
    communes: [{ name: "Rennes", code: "35238", postalCode: "35000" }],
    regions: ["Bretagne"],
    ...overrides,
  } as AdminDossierExportRow;
}

function makeAvis(overrides: Partial<AdminAvisExpertExportRow> = {}): AdminAvisExpertExportRow {
  return {
    dossier: 42,
    expert: "CNPN",
    saisine_date: new Date("2026-04-01T08:00:00.000Z"),
    saisine_fichier: "saisine.pdf",
    avis: "Favorable sous conditions",
    avis_date: new Date("2026-06-12T08:00:00.000Z"),
    avis_fichier: "avis.pdf",
    ...overrides,
  } as AdminAvisExpertExportRow;
}

describe("dossiersSheetRows", () => {
  it("prefers the Pitchou activity name over the raw DN label", () => {
    const [, row] = dossiersSheetRows([
      makeRow({
        main_activite: "Production énergie renouvelable - Éolien",
        activite_code: "energie-eolien",
        activite_label: "Éolien",
      }),
    ]);
    expect(row).toContain("Éolien");
  });

  it("falls back to the personne physique name when there is no entreprise", () => {
    const [, row] = dossiersSheetRows([
      makeRow({
        demandeur_entreprise: null,
        demandeur_last_name: "Durand",
        demandeur_first_names: "Camille",
      }),
    ]);
    expect(row).toContain("Durand Camille");
  });

  it("leaves absent columns empty", () => {
    const [, row] = dossiersSheetRows([
      makeRow({
        name: null,
        demarche_numerique_number: null,
        source: "pitchou",
        demandeur_entreprise: null,
        groupe_name: null,
        main_activite: null,
        activite_code: null,
        activite_label: null,
        primary_department: null,
        departments: null,
        communes: null,
        regions: null,
      }),
    ]);
    expect(row).toEqual([
      42,
      "",
      "",
      "Créé dans Pitchou",
      "2026-03-04",
      "Instruction",
      "2026-05-20",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  });

  it("leaves both phase columns empty when no phase was ever recorded", () => {
    const [, row] = dossiersSheetRows([makeRow({ phase: null, phase_date: null })]);
    expect(row[5]).toBe("");
    expect(row[6]).toBe("");
  });

  it("keeps only communes with a usable name or code", () => {
    const [, row] = dossiersSheetRows([
      makeRow({ communes: [{ name: "Brest" }, { code: "29019" }, null, "Lorient"] }),
    ]);
    expect(row).toContain("Brest ; 29019");
  });
});

describe("avisExpertSheetRows", () => {
  it("leaves absent columns empty", () => {
    const [, row] = avisExpertSheetRows([
      makeAvis({
        expert: null,
        saisine_date: null,
        saisine_fichier: null,
        avis: null,
        avis_date: null,
        avis_fichier: null,
      }),
    ]);
    expect(row).toEqual([42, "", "", "", "", "", ""]);
  });
});

describe("dossiersExportSheets", () => {
  it("puts the dossiers on the first sheet and the avis experts on the second", () => {
    const [dossiers, avis] = dossiersExportSheets([makeRow()], [makeAvis()]);
    expect(dossiers.name).toBe("Dossiers");
    expect(dossiers.rows[0][0]).toBe("Identifiant Pitchou");
    expect(dossiers.rows[1][1]).toBe("Parc éolien");
    expect(avis.name).toBe("Avis experts");
    expect(avis.rows[0][1]).toBe("Expert");
    expect(avis.rows[1][4]).toBe("Favorable sous conditions");
  });
});
