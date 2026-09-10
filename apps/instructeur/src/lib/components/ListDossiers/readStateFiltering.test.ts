import { expect, test, describe } from "vitest";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { filterDossiers } from "./listModel.ts";
import {
  dossierId,
  makeQuery,
  makeDossier,
  makeContext,
  makeNotification,
  type Notification,
} from "./testHelpers.ts";

describe("filterDossiers by read state", () => {
  test("unread modifications include arrival, follow and field changes independently of followers", () => {
    const date = new Date("2026-09-01");
    const dossiers = [1, 2, 3, 4, 5].map((id) => makeDossier({ id: dossierId(id) }));
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      [dossierId(1), makeNotification({ viewed: false, new_arrival: { detected_at: date } })],
      [
        dossierId(2),
        makeNotification({ viewed: false, new_follow: { revision: "1", detected_at: date } }),
      ],
      [
        dossierId(3),
        makeNotification({
          viewed: false,
          changes: [
            {
              field: "name",
              label: "Nom du projet",
              revisions: [],
              detected_at: date,
              modified_at: date,
            },
          ],
        }),
      ],
      [dossierId(4), makeNotification()],
    ]);
    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "oui" }),
      makeContext({
        notificationByDossier,
        followRelations: new Map([["me@example.org", new Set([dossierId(2)])]]),
      }),
    );
    expect(result.map((dossier) => dossier.id)).toEqual([1, 2, 3]);
  });

  test("« nouveaute oui » keeps only dossiers with an unseen notification", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      [dossierId(1), makeNotification({ viewed: false, updated_at: new Date("2024-05-01") })],
      [dossierId(2), makeNotification({ updated_at: new Date("2024-05-02") })],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "oui" }),
      makeContext({ notificationByDossier }),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« nouveaute non » keeps dossiers without an unseen notification", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const notificationByDossier = new Map<DossierSummary["id"], Notification>([
      [dossierId(1), makeNotification({ viewed: false, updated_at: new Date("2024-05-01") })],
      [dossierId(2), makeNotification({ updated_at: new Date("2024-05-02") })],
    ]);
    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "non" }),
      makeContext({ notificationByDossier }),
    );
    // 2 is seen, 3 has no notification at all → both kept; 1 is unseen → dropped
    expect(result.map((d) => d.id)).toEqual([2, 3]);
  });
});
