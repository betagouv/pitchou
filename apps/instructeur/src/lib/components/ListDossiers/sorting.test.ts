import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { compareDossiers } from "./listModel.ts";
import { dossierId, makeDossier, type Notification } from "./testHelpers.ts";

describe("compareDossiers", () => {
  const noNotifications = new Map<DossierSummary["id"], Notification>();

  function sortIds(
    dossiers: DossierSummary[],
    ...[sort, order, notifs]: [
      Parameters<typeof compareDossiers>[2],
      Parameters<typeof compareDossiers>[3],
      Parameters<typeof compareDossiers>[4]?,
    ]
  ): number[] {
    return [...dossiers]
      .sort((a, b) => compareDossiers(a, b, sort, order, notifs ?? noNotifications))
      .map((d) => d.id as number);
  }

  test("sorts by deposit date, newest first when descending", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), depot_date: new Date("2024-01-01") }),
      makeDossier({ id: dossierId(2), depot_date: new Date("2024-03-01") }),
      makeDossier({ id: dossierId(3), depot_date: new Date("2024-02-01") }),
    ];
    expect(sortIds(dossiers, "depositDate", "desc")).toEqual([2, 3, 1]);
    expect(sortIds(dossiers, "depositDate", "asc")).toEqual([1, 3, 2]);
  });

  test("sorts by last modification date, placing unknown dates last in both directions", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      [dossierId(1), { viewed: true, updated_at: new Date("2024-05-01") }],
      [dossierId(2), { viewed: true, updated_at: new Date("2024-05-10") }],
      // 3 has no notification → unknown date
    ]);
    expect(sortIds(dossiers, "lastModified", "desc", notificationByDossier)).toEqual([2, 1, 3]);
    expect(sortIds(dossiers, "lastModified", "asc", notificationByDossier)).toEqual([1, 2, 3]);
  });

  test("sorts by next échéance, placing dossiers without one last in both directions", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), next_due_date: new Date("2026-09-01") }),
      makeDossier({ id: dossierId(2), next_due_date: new Date("2026-08-10") }),
      // 3 has no échéance
      makeDossier({ id: dossierId(3) }),
    ];
    expect(sortIds(dossiers, "nextDueDate", "desc")).toEqual([1, 2, 3]);
    expect(sortIds(dossiers, "nextDueDate", "asc")).toEqual([2, 1, 3]);
  });

  test("an unseen nouveauté no longer changes the order", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), depot_date: new Date("2024-01-01") }),
      makeDossier({ id: dossierId(2), depot_date: new Date("2024-01-02") }),
      makeDossier({ id: dossierId(3), depot_date: new Date("2024-01-03") }),
    ];
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      // Only the oldest dossier has an unseen nouveauté; it stays where its date puts it.
      [dossierId(1), { viewed: false, updated_at: new Date("2024-05-01") }],
      [dossierId(2), { viewed: true, updated_at: new Date("2024-05-02") }],
      [dossierId(3), { viewed: true, updated_at: new Date("2024-05-03") }],
    ]);
    expect(sortIds(dossiers, "depositDate", "desc", notificationByDossier)).toEqual([3, 2, 1]);
  });
});
