import { expect, test, describe } from "vitest";

import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import { compareDossiers } from "./dossiersList.ts";
import { dossierId, makeDossier, type Notification } from "./dossiersTestHelpers.ts";

describe("compareDossiers", () => {
  const noNotifications = new Map<DossierRésumé["id"], Notification>();

  function sortIds(
    dossiers: DossierRésumé[],
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

  test("sorts by name with French collation and honours the order", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), nom: "Zèbre" }),
      makeDossier({ id: dossierId(2), nom: "Abricot" }),
      makeDossier({ id: dossierId(3), nom: "Éléphant" }),
    ];
    expect(sortIds(dossiers, "name", "asc")).toEqual([2, 3, 1]);
    expect(sortIds(dossiers, "name", "desc")).toEqual([1, 3, 2]);
  });

  test("sorts by deposit date, newest first when descending", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_dépôt: new Date("2024-01-01") }),
      makeDossier({ id: dossierId(2), date_dépôt: new Date("2024-03-01") }),
      makeDossier({ id: dossierId(3), date_dépôt: new Date("2024-02-01") }),
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
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-10") }],
      // 3 has no notification → unknown date
    ]);
    expect(sortIds(dossiers, "lastModified", "desc", notificationParDossier)).toEqual([2, 1, 3]);
    expect(sortIds(dossiers, "lastModified", "asc", notificationParDossier)).toEqual([1, 2, 3]);
  });

  test("« nouveaute » puts unseen notifications first, most recent first", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_dépôt: new Date("2024-01-01") }),
      makeDossier({ id: dossierId(2), date_dépôt: new Date("2024-01-02") }),
      makeDossier({ id: dossierId(3), date_dépôt: new Date("2024-01-03") }),
    ];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-03") }],
      [dossierId(3), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-02") }],
    ]);
    // Unseen (2 then 1, by update date) come before the seen dossier 3.
    expect(sortIds(dossiers, "nouveaute", "desc", notificationParDossier)).toEqual([2, 1, 3]);
  });
});
