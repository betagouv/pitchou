import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { filterDossiers } from "./dossiersList.ts";
import {
  dossierId,
  makeQuery,
  makeDossier,
  makeContext,
  type Notification,
} from "./dossiersTestHelpers.ts";

describe("filterDossiers — date range", () => {
  // Dates are built with an explicit local time so the assertions stay independent
  // of the runner's timezone (the filter also builds its bounds in local time).
  test("keeps dossiers whose deposit date falls inside the inclusive range", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_dépôt: new Date("2024-01-15T12:00:00") }),
      makeDossier({ id: dossierId(2), date_dépôt: new Date("2024-02-01T09:00:00") }),
      makeDossier({ id: dossierId(3), date_dépôt: new Date("2024-02-28T15:00:00") }),
      makeDossier({ id: dossierId(4), date_dépôt: new Date("2024-03-10T12:00:00") }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "deposit", dateStart: "2024-02-01", dateEnd: "2024-02-28" }),
      makeContext(),
    );
    // Both bounds are inclusive: the 1st (start of day) and the 28th (end of day) are kept.
    expect(result.map((d) => d.id)).toEqual([2, 3]);
  });

  test("filters on the phase start date when that field is chosen", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_début_phase: new Date("2024-06-15T12:00:00") }),
      makeDossier({ id: dossierId(2), date_début_phase: new Date("2024-09-15T12:00:00") }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "phaseStart", dateStart: "2024-06-01", dateEnd: "2024-06-30" }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("filters on the last modification date when that field is chosen", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      [dossierId(1), { vue: true, date_dernière_mise_à_jour: new Date("2024-06-15T12:00:00") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-09-15T12:00:00") }],
    ]);
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "lastModified", dateStart: "2024-06-01", dateEnd: "2024-06-30" }),
      makeContext({ notificationByDossier }),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("excludes dossiers that lack the chosen date", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_début_phase: new Date("2024-06-15T12:00:00") }),
      makeDossier({ id: dossierId(2), date_début_phase: undefined }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "phaseStart", dateStart: "2024-01-01" }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });
});
