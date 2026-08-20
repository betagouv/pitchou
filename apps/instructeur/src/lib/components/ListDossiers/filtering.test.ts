import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { filterDossiers, WITHOUT_INSTRUCTEUR } from "./listModel.ts";
import {
  dossierId,
  makeQuery,
  makeDossier,
  makeContext,
  type Notification,
} from "./testHelpers.ts";

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

  test("routes the text search through the filter (digit query matches a département code)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), departments: ["64"] }),
      makeDossier({ id: dossierId(2), departments: ["33"] }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ text: "64" }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("keeps only the chosen activité (by code), dropping dossiers with none", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), activite_code: "carrieres" }),
      // A raw label renamed in DN resolves to the same code and stays grouped.
      makeDossier({ id: dossierId(2), activite_code: "carrieres" }),
      makeDossier({ id: dossierId(3), activite_code: "conservation-especes" }),
      makeDossier({ id: dossierId(4), activite_code: null }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ activite: ["carrieres"] }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1, 2]);
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
