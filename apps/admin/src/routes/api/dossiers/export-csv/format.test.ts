import { describe, expect, it } from "vitest";
import type { AdminDossierExportRow } from "@pitchou/server/database/dossier_admin_list.ts";
import { dossiersExportToCSV } from "./format.ts";

function makeRow(overrides: Partial<AdminDossierExportRow> = {}): AdminDossierExportRow {
  return {
    id: 42,
    name: "Parc éolien",
    demarche_numerique_number: "123456",
    source: "demarche_numerique",
    depot_date: new Date("2026-03-04T10:00:00.000Z"),
    phase: "Instruction",
    demandeur_last_name: null,
    demandeur_first_names: null,
    demandeur_entreprise: "ACME",
    groupe_name: "DREAL Bretagne",
    main_activite: "Production d'énergie renouvelable",
    primary_department: "35",
    departments: ["35", "22"],
    communes: [{ name: "Rennes", code: "35238", postalCode: "35000" }],
    regions: ["Bretagne"],
    ...overrides,
  } as AdminDossierExportRow;
}

describe("dossiersExportToCSV", () => {
  it("writes a header and one line per dossier", () => {
    const [header, line] = dossiersExportToCSV([makeRow()]).split("\n");
    expect(header).toBe(
      "Identifiant Pitchou,Nom du dossier,Numéro Démarches Numériques,Source,Date de dépôt,Phase," +
        "Demandeur,Groupe instructeurs,Activité principale,Département principal,Départements," +
        "Communes,Régions",
    );
    expect(line).toBe(
      "42,Parc éolien,123456,Importé de Démarches Numériques,2026-03-04,Instruction,ACME," +
        "DREAL Bretagne,Production d'énergie renouvelable,35,35 ; 22,Rennes (35238),Bretagne",
    );
  });

  it("prefers the Pitchou activity name over the raw DN label", () => {
    const csv = dossiersExportToCSV([
      makeRow({
        main_activite: "Production énergie renouvelable - Éolien",
        activite_code: "energie-eolien",
        activite_label: "Éolien",
      }),
    ]);
    expect(csv.split("\n")[1]).toContain(",Éolien,");
  });

  it("falls back to the personne physique name when there is no entreprise", () => {
    const csv = dossiersExportToCSV([
      makeRow({
        demandeur_entreprise: null,
        demandeur_last_name: "Durand",
        demandeur_first_names: "Camille",
      }),
    ]);
    expect(csv.split("\n")[1]).toContain(",Durand Camille,");
  });

  it("leaves absent columns empty", () => {
    const csv = dossiersExportToCSV([
      makeRow({
        name: null,
        demarche_numerique_number: null,
        source: "pitchou",
        demandeur_entreprise: null,
        groupe_name: null,
        main_activite: null,
        primary_department: null,
        departments: null,
        communes: null,
        regions: null,
      }),
    ]);
    expect(csv.split("\n")[1]).toBe("42,,,Créé dans Pitchou,2026-03-04,Instruction,,,,,,,");
  });

  it("quotes fields that contain a comma or a quote", () => {
    const csv = dossiersExportToCSV([makeRow({ name: 'Projet "Nord, Sud"' })]);
    expect(csv.split("\n")[1]).toContain('"Projet ""Nord, Sud"""');
  });

  it("keeps only communes with a usable name or code", () => {
    const csv = dossiersExportToCSV([
      makeRow({ communes: [{ name: "Brest" }, { code: "29019" }, null, "Lorient"] }),
    ]);
    expect(csv.split("\n")[1]).toContain(",Brest ; 29019,");
  });
});
