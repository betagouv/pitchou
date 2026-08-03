import { describe, expect, test } from "vitest";

import { withoutRedundantDepositPhase } from "./phaseHistory.ts";

describe("withoutRedundantDepositPhase", () => {
  test("removes an initial Accompagnement event already represented by the deposit", () => {
    expect(
      withoutRedundantDepositPhase(
        [{ phase: "Accompagnement amont", timestamp: "2026-08-03T10:00:00Z" }],
        "2026-08-03",
      ),
    ).toEqual([]);
  });

  test("preserves later and non-default phase events", () => {
    const events = [
      { phase: "Instruction", timestamp: "2026-08-04T10:00:00Z" },
      { phase: "Accompagnement amont", timestamp: "2026-08-03T10:00:00Z" },
    ];
    expect(withoutRedundantDepositPhase(events, "2026-08-02")).toEqual(events);
  });
});
