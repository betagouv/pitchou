import { describe, expect, test } from "vitest";
import { groupDossiersByMonth } from "./sections.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

function dossier(
  id: number,
  depotDate: string | null,
  nextDueDate?: string | null,
): DossierSummary {
  return {
    id,
    depot_date: depotDate && new Date(depotDate),
    next_due_date: nextDueDate && new Date(nextDueDate),
  } as unknown as DossierSummary;
}

const noNotification = () => null;

describe("groupDossiersByMonth", () => {
  test("returns nothing for an empty list", () => {
    expect(groupDossiersByMonth([], "depositDate", noNotification)).toEqual([]);
  });

  test("gathers consecutive dossiers of the same month under one title", () => {
    const sections = groupDossiersByMonth(
      [dossier(1, "2026-07-29"), dossier(2, "2026-07-03"), dossier(3, "2026-06-24")],
      "depositDate",
      noNotification,
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Déposés en juillet 2026",
      "Déposés en juin 2026",
    ]);
    expect(sections.map((section) => section.dossiers.map((d) => d.id))).toEqual([[1, 2], [3]]);
  });

  test("keeps the given order, opening a new section when a month comes back", () => {
    const sections = groupDossiersByMonth(
      [dossier(1, "2026-07-29"), dossier(2, "2026-06-24"), dossier(3, "2026-07-03")],
      "depositDate",
      noNotification,
    );

    expect(sections).toHaveLength(3);
    expect(new Set(sections.map((section) => section.key)).size).toBe(3);
  });

  test("groups dossiers without a dépôt date together", () => {
    const sections = groupDossiersByMonth(
      [dossier(1, null), dossier(2, null)],
      "depositDate",
      noNotification,
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Date de dépôt inconnue");
  });

  test("groups by next due date with its own wording when sorted by échéance", () => {
    const sections = groupDossiersByMonth(
      [dossier(1, "2026-01-01", "2026-07-15"), dossier(2, "2026-02-01", null)],
      "nextDueDate",
      noNotification,
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Échéance en juillet 2026",
      "Date d'échéance inconnue",
    ]);
  });

  test("groups by notification date with its own wording when sorted by last modification", () => {
    const updatedAt = new Map([[1, new Date("2026-07-10")]]);
    const sections = groupDossiersByMonth(
      [dossier(1, "2026-01-01"), dossier(2, "2026-02-01")],
      "lastModified",
      (id) => updatedAt.get(id) ?? null,
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Dernièrement modifiés en juillet 2026",
      "Date de dernière modification inconnue",
    ]);
  });
});
