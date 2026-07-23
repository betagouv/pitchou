import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
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
      makeDossier({ id: dossierId(1), departments: ["44", "49"] }),
      makeDossier({ id: dossierId(2), departments: ["33"] }),
      makeDossier({ id: dossierId(3), departments: ["75"] }),
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
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      [dossierId(1), { viewed: false, updated_at: new Date("2024-05-01") }],
      [dossierId(2), { viewed: true, updated_at: new Date("2024-05-02") }],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "oui" }),
      makeContext({ notificationByDossier }),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« sans instructeur·ice » keeps only dossiers nobody follows", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const followRelations = new Map<string, Set<DossierSummary["id"]>>([
      ["jane@doe.fr", new Set([dossierId(1)])],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR] }),
      makeContext({ followRelations }),
    );
    expect(result.map((d) => d.id)).toEqual([2]);
  });

  test("« sans instructeur·ice » combined with a named one keeps both (OR)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const followRelations = new Map<string, Set<DossierSummary["id"]>>([
      ["jane@doe.fr", new Set([dossierId(1)])],
      ["john@doe.fr", new Set([dossierId(3)])],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"] }),
      makeContext({ followRelations }),
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

  test("« décision administrative non renseignée » keeps dossiers with no décision file", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), decisionsAdministratives: [] }),
      makeDossier({
        id: dossierId(2),
        decisionsAdministratives: [
          { number: "AP-2024-042", hasFile: true },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
      makeDossier({
        id: dossierId(3),
        decisionsAdministratives: [
          { number: "AP-2024-777", hasFile: false },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ decisionAbsente: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1, 3]);
  });

  test("« décision administrative » matches the numéro, case- and accent-insensitively", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        decisionsAdministratives: [
          { number: "AP-2024-042" },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
      makeDossier({
        id: dossierId(2),
        decisionsAdministratives: [
          { number: "AP-2023-999" },
        ] as unknown as DossierSummary["decisionsAdministratives"],
      }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ decisionText: "2024-042" }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« avis CNPN/CSRPN non renseigné » keeps dossiers with no CNPN/CSRPN avis file", () => {
    const dossiers = [
      // A CNPN avis with its file: renseigné, excluded.
      makeDossier({
        id: dossierId(1),
        avisExperts: [{ expert: "CNPN", hasSaisineFile: true, hasAvisFile: true }],
      }),
      // A CSRPN avis without its file: kept.
      makeDossier({
        id: dossierId(2),
        avisExperts: [{ expert: "CSRPN", hasSaisineFile: true, hasAvisFile: false }],
      }),
      // No avis at all: kept.
      makeDossier({ id: dossierId(3), avisExperts: [] }),
      // Only an « Autre expert » avis with its file: that type is ignored, so kept.
      makeDossier({
        id: dossierId(4),
        avisExperts: [{ expert: "Autre expert", hasSaisineFile: true, hasAvisFile: true }],
      }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ avisExpertManquant: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([2, 3, 4]);
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
      makeDossier({ id: dossierId(1), departments: ["64"] }),
      makeDossier({ id: dossierId(2), departments: ["33"] }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ text: "64" }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("keeps only the chosen activité, dropping dossiers with none", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), main_activite: "Carrières" }),
      makeDossier({ id: dossierId(2), main_activite: "Conservation des espèces" }),
      makeDossier({ id: dossierId(3), main_activite: null }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ activite: ["Carrières"] }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« actionInstructeur » keeps dossiers awaiting the instructeur", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), next_action_expected_from: "Instructeur" }),
      makeDossier({ id: dossierId(2), next_action_expected_from: "Pétitionnaire" }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ actionInstructeur: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("keeps dossiers matching any selected prochaine action (OR)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), next_action_expected_from: "Instructeur" }),
      makeDossier({ id: dossierId(2), next_action_expected_from: "Pétitionnaire" }),
      makeDossier({ id: dossierId(3), next_action_expected_from: null }),
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
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      [dossierId(1), { viewed: false, updated_at: new Date("2024-05-01") }],
      [dossierId(2), { viewed: true, updated_at: new Date("2024-05-02") }],
    ]);
    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "non" }),
      makeContext({ notificationByDossier }),
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
