import { describe, expect, test } from "vitest";

import { nouvellesModifications } from "./modifications.ts";
import type { DossierAction } from "@pitchou/types/capabilities.ts";

function action(overrides: Partial<DossierAction>): DossierAction {
  return {
    id: "a",
    type: "champ_modifie",
    data: { field: "Description" },
    author_email: null,
    author_petitionnaire: true,
    created_at: new Date("2026-08-10T10:00:00Z"),
    ...overrides,
  } as DossierAction;
}

describe("nouvellesModifications", () => {
  test("collects the latest date per champ, plus espèces and pièces jointes", () => {
    const result = nouvellesModifications(
      [
        action({ id: "1", created_at: new Date("2026-08-10T10:00:00Z") }),
        action({ id: "2", created_at: new Date("2026-08-12T10:00:00Z") }),
        action({ id: "3", data: { field: "Motif de la dérogation" } }),
        action({ id: "4", type: "especes_renseignees", data: {} }),
        action({ id: "5", type: "piece_jointe_importee", data: { name: "plan.pdf" } }),
      ],
      null,
    );
    expect(result.fieldDates.get("Description")).toEqual(new Date("2026-08-12T10:00:00Z"));
    expect(result.fieldDates.get("Motif de la dérogation")).toEqual(
      new Date("2026-08-10T10:00:00Z"),
    );
    expect(result.especes).toEqual(new Date("2026-08-10T10:00:00Z"));
    expect(result.piecesJointes).toEqual(new Date("2026-08-10T10:00:00Z"));
  });

  test("ignores actions already read and actions of the instructeurs", () => {
    const result = nouvellesModifications(
      [
        action({ id: "1", created_at: new Date("2026-08-10T10:00:00Z") }),
        action({
          id: "2",
          created_at: new Date("2026-08-14T10:00:00Z"),
          author_petitionnaire: false,
          author_email: "instructeur@example.com",
        }),
      ],
      new Date("2026-08-11T00:00:00Z"),
    );
    expect(result.fieldDates.size).toBe(0);
    expect(result.especes).toBeNull();
    expect(result.piecesJointes).toBeNull();
  });

  test("without a read date, every pétitionnaire action counts", () => {
    const result = nouvellesModifications([action({ id: "1" })], null);
    expect(result.fieldDates.size).toBe(1);
  });
});
