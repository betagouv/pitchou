import { expect, test } from "vitest";
import * as XLSX from "xlsx";
import type { ExportDossier } from "@pitchou/types/dossierExport.ts";
import { dossierExportRow, dossiersExportHeaders, dossiersExportTable } from "./dossiersExport.ts";
import { tableToCsv, tableToOds } from "./spreadsheet.ts";

function dossier(overrides: Partial<ExportDossier> = {}): ExportDossier {
  return {
    id: 42 as ExportDossier["id"],
    demarche_numerique_number: null,
    name: 'Projet, avec des "guillemets"\net une deuxième ligne',
    depot_date: new Date("2026-09-01T10:00:00Z"),
    main_activite: "Production énergie renouvelable - Éolien",
    activite_label: "Parc éolien",
    primary_department: "75",
    communes: [{ name: "Paris", code: "75056", postalCode: "75000" }],
    departments: ["75"],
    regions: ["Île-de-France"],
    location_scope: "communes",
    demandeur_personne_morale_legal_name: "Entreprise",
    demandeur_personne_morale_siret: "00123456789012",
    demandeur_personne_physique_last_name: "",
    demandeur_personne_physique_first_names: "",
    linked_to_ae_regime: true,
    ddep_required: null,
    er_mesures_sufficient: null,
    enjeu: false,
    phase: "Instruction",
    followers: ["b@example.fr", "a@example.fr", "a@example.fr"],
    especes: [],
    avis: [],
    decisions: [],
    prescriptions: [],
    ...overrides,
  };
}

test("exports all 21 columns, preserving identifiers, accents, quotes and multiline cells in CSV and ODS", async () => {
  const data = dossier();
  const table = dossiersExportTable([data]);
  const expected = [dossiersExportHeaders, dossierExportRow(data)];
  expect(table[1]).toHaveLength(21);
  expect(table[1].slice(0, 12)).toEqual([
    "42",
    data.name,
    "Parc éolien",
    "01/09/2026",
    "a@example.fr ; b@example.fr",
    "75",
    "Paris ; 75 ; Île-de-France",
    "Entreprise ; 00123456789012",
    "Oui",
    "Instruction",
    "À déterminer",
    "Non",
  ]);
  for (const bytes of [tableToCsv(table), await tableToOds(table)]) {
    const workbook = XLSX.read(typeof bytes === "string" ? bytes.replace(/^\uFEFF/, "") : bytes, {
      type: typeof bytes === "string" ? "string" : "array",
      raw: true,
    });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      defval: "",
    });
    expect(rows).toEqual(
      typeof bytes === "string" ? expected.map((row) => row.map(String)) : expected,
    );
  }
});

test.each([
  [true, null, "Oui"],
  [false, true, "Non car mesures ER suffisantes"],
  [false, false, "Non sans objet"],
  [null, null, "À déterminer"],
] as const)("DDEP required=%s ER sufficient=%s", (required, sufficient, expected) => {
  expect(
    dossierExportRow(dossier({ ddep_required: required, er_mesures_sufficient: sufficient }))[10],
  ).toBe(expected);
});

test("deduplicates species and experts, exports flags independently, and uses latest control per prescription", () => {
  const espece = {
    cd_ref: "2437",
    noms_vernaculaires: ["Fou de Bassan"],
    noms_scientifiques: ["Morus bassanus"],
    espece_cnpn: true,
    espece_ministerielle: true,
  };
  const row = dossierExportRow(
    dossier({
      especes: [espece, espece],
      avis: [
        {
          expert: "CNPN",
          saisine_date: new Date(),
          saisine_fichier: null,
          avis_date: null,
          avis_fichier: null,
          avis: null,
        },
        {
          expert: "CNPN",
          saisine_date: new Date(),
          saisine_fichier: null,
          avis_date: new Date(),
          avis_fichier: null,
          avis: "Favorable",
        },
        {
          expert: "Autre expert",
          saisine_date: null,
          saisine_fichier: null,
          avis_date: null,
          avis_fichier: null,
          avis: "Défavorable",
        },
        {
          expert: "CSRPN",
          saisine_date: null,
          saisine_fichier: null,
          avis_date: null,
          avis_fichier: null,
          avis: null,
        },
      ],
      decisions: [
        {
          number: "AP-1",
          type: "Arrêté dérogation",
          signature_date: new Date("2026-09-15T10:00:00Z"),
        },
      ],
      prescriptions: [
        {
          controles: [
            { controle_date: new Date("2026-07-01"), result: "Non conforme" },
            { controle_date: new Date("2026-08-01"), result: "Conforme" },
          ],
        },
        {
          controles: [
            { controle_date: new Date("2026-08-01"), result: "Conforme" },
            { controle_date: new Date("2026-09-01"), result: "Non conforme" },
          ],
        },
        { controles: [] },
        { controles: [{ controle_date: null, result: "En cours" }] },
      ],
    }),
  );
  expect(row.slice(12)).toEqual([
    "Fou de Bassan (Morus bassanus)",
    "Fou de Bassan (Morus bassanus)",
    "Fou de Bassan (Morus bassanus)",
    "Oui CNPN",
    "Oui CNPN ; Oui Autre",
    "AP-1 - Arrêté dérogation - 15/09/2026",
    1,
    3,
    5,
  ]);
});

test("CSV neutralizes formulas while ODS stores them as literal strings", async () => {
  const table = [["=1+1", " \t@SUM(A1)", "+cmd", "-cmd", "00123", 2]];
  expect(tableToCsv(table)).toContain(`"'=1+1","' \t@SUM(A1)","'+cmd","'-cmd","00123","2"`);
  const ods = XLSX.read(await tableToOds(table), { type: "array" });
  expect(ods.Sheets.Dossiers.A1).toMatchObject({ t: "s", v: "=1+1" });
  expect(ods.Sheets.Dossiers.A1.f).toBeUndefined();
});
