import { expect, test, describe } from "vitest";

import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import { filterDossiers, WITHOUT_INSTRUCTEUR } from "./dossiersList.ts";
import {
  dossierId,
  makeQuery,
  makeDossier,
  makeContext,
  type Notification,
} from "./dossiersTestHelpers.ts";

describe("filterDossiers", () => {
  test("keeps only the chosen phase", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), phase: "Instruction" }),
      makeDossier({ id: dossierId(2), phase: "Contrôle" }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ phase: ["Contrôle"] }), makeContext());
    expect(result.map((d) => d.id)).toEqual([2]);
  });

  test("keeps dossiers matching any of several selected phases", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), phase: "Instruction" }),
      makeDossier({ id: dossierId(2), phase: "Contrôle" }),
      makeDossier({ id: dossierId(3), phase: "Accompagnement amont" }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ phase: ["Instruction", "Contrôle"] }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });

  test("keeps a dossier when any of its départements is selected", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), départements: ["44", "49"] }),
      makeDossier({ id: dossierId(2), départements: ["33"] }),
      makeDossier({ id: dossierId(3), départements: ["75"] }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ departement: ["33", "49"] }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });

  test("« nouveaute oui » keeps only dossiers with an unseen notification", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-02") }],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "oui" }),
      makeContext({ notificationParDossier }),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« sans instructeur·ice » keeps only dossiers nobody follows", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const relationSuivis = new Map<string, Set<DossierRésumé["id"]>>([
      ["jane@doe.fr", new Set([dossierId(1)])],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR] }),
      makeContext({ relationSuivis }),
    );
    expect(result.map((d) => d.id)).toEqual([2]);
  });

  test("« sans instructeur·ice » combined with a named one keeps both (OR)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const relationSuivis = new Map<string, Set<DossierRésumé["id"]>>([
      ["jane@doe.fr", new Set([dossierId(1)])],
      ["john@doe.fr", new Set([dossierId(3)])],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"] }),
      makeContext({ relationSuivis }),
    );
    // 1 is followed by jane, 2 is unfollowed; 3 is followed only by john → excluded
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });

  test("« à enjeu » keeps only dossiers flagged as such", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), enjeu: true }),
      makeDossier({ id: dossierId(2), enjeu: false }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ enjeu: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« décision non-renseignée » keeps dossiers without any décision administrative", () => {
    const décision = [
      { numéro: "AP-2024-042" },
    ] as unknown as DossierRésumé["décisionsAdministratives"];
    const dossiers = [
      makeDossier({ id: dossierId(1), décisionsAdministratives: [] }),
      makeDossier({ id: dossierId(2), décisionsAdministratives: décision }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ decisionAbsente: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« décision administrative » matches the numéro, case- and accent-insensitively", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        décisionsAdministratives: [
          { numéro: "AP-2024-042" },
        ] as unknown as DossierRésumé["décisionsAdministratives"],
      }),
      makeDossier({
        id: dossierId(2),
        décisionsAdministratives: [
          { numéro: "AP-2023-999" },
        ] as unknown as DossierRésumé["décisionsAdministratives"],
      }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ decisionText: "2024-042" }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« saisine ou avis manquant » keeps dossiers with an incomplete avis expert", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        avisExperts: [{ saisineFichierPresent: true, avisFichierPresent: false }],
      }),
      makeDossier({
        id: dossierId(2),
        avisExperts: [{ saisineFichierPresent: true, avisFichierPresent: true }],
      }),
      makeDossier({ id: dossierId(3), avisExperts: [] }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ avisExpertManquant: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« espèces impactées non-renseignée » keeps dossiers without the file", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), especesImpacteesRenseignees: false }),
      makeDossier({ id: dossierId(2), especesImpacteesRenseignees: true }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ especesImpacteesAbsente: true }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("routes the text search through the filter (digit query matches a département code)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), départements: ["64"] }),
      makeDossier({ id: dossierId(2), départements: ["33"] }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ text: "64" }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("keeps only the chosen activité, dropping dossiers with none", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), activité_principale: "Carrières" }),
      makeDossier({ id: dossierId(2), activité_principale: "Conservation des espèces" }),
      makeDossier({ id: dossierId(3), activité_principale: null }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ activite: ["Carrières"] }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« actionInstructeur » keeps dossiers awaiting the instructeur", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), prochaine_action_attendue_par: "Instructeur" }),
      makeDossier({ id: dossierId(2), prochaine_action_attendue_par: "Pétitionnaire" }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ actionInstructeur: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("keeps dossiers matching any selected prochaine action (OR)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), prochaine_action_attendue_par: "Instructeur" }),
      makeDossier({ id: dossierId(2), prochaine_action_attendue_par: "Pétitionnaire" }),
      makeDossier({ id: dossierId(3), prochaine_action_attendue_par: null }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ prochaineAction: ["Instructeur", "Pétitionnaire"] }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });

  test("« nouveaute non » keeps dossiers without an unseen notification", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-02") }],
    ]);
    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "non" }),
      makeContext({ notificationParDossier }),
    );
    // 2 is seen, 3 has no notification at all → both kept; 1 is unseen → dropped
    expect(result.map((d) => d.id)).toEqual([2, 3]);
  });

  test("combines active filters with AND", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), phase: "Instruction", enjeu: true }),
      makeDossier({ id: dossierId(2), phase: "Instruction", enjeu: false }),
      makeDossier({ id: dossierId(3), phase: "Contrôle", enjeu: true }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ phase: ["Instruction"], enjeu: true }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });
});
