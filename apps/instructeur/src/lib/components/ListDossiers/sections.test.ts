import { describe, expect, test } from "vitest";
import { groupDossiersByDepotMonth } from "./sections.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

function dossier(id: number, depotDate: string | null): DossierSummary {
  return { id, depot_date: depotDate && new Date(depotDate) } as unknown as DossierSummary;
}

describe("groupDossiersByDepotMonth", () => {
  test("returns nothing for an empty list", () => {
    expect(groupDossiersByDepotMonth([])).toEqual([]);
  });

  test("gathers consecutive dossiers of the same month under one title", () => {
    const sections = groupDossiersByDepotMonth([
      dossier(1, "2026-07-29"),
      dossier(2, "2026-07-03"),
      dossier(3, "2026-06-24"),
    ]);

    expect(sections.map((section) => section.title)).toEqual([
      "Déposés en juillet 2026",
      "Déposés en juin 2026",
    ]);
    expect(sections.map((section) => section.dossiers.map((d) => d.id))).toEqual([[1, 2], [3]]);
  });

  test("keeps the given order, opening a new section when a month comes back", () => {
    const sections = groupDossiersByDepotMonth([
      dossier(1, "2026-07-29"),
      dossier(2, "2026-06-24"),
      dossier(3, "2026-07-03"),
    ]);

    expect(sections).toHaveLength(3);
    expect(new Set(sections.map((section) => section.key)).size).toBe(3);
  });

  test("groups dossiers without a dépôt date together", () => {
    const sections = groupDossiersByDepotMonth([dossier(1, null), dossier(2, null)]);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Date de dépôt inconnue");
  });
});
