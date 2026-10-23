import { expect, test } from "vitest";
import { comparePhaseEventsNewestFirst } from "./phases.ts";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

test.each([
  ["2025-02-01T00:00:00.400Z", "Contrôle"],
  ["2025-02-01T00:00:00.600Z", "Instruction"],
])("optimistic events match persisted second precision at %s", (timestamp, expected) => {
  const events = [
    { phase: "Instruction" as const, timestamp },
    { phase: "Contrôle" as const, timestamp: "2025-02-01T00:00:00.000Z" },
  ];
  expect(events.sort(comparePhaseEventsNewestFirst)[0].phase).toBe(expected);
});

test("equal phase timestamps use progression and terminal states, independent of input order", () => {
  const expected: DossierPhase[] = [
    "Obligations terminées",
    "Classé sans suite",
    "Contrôle",
    "Instruction",
    "Étude recevabilité",
    "Accompagnement amont",
  ];
  const events = expected.map((phase) => ({ phase, timestamp: new Date("2025-02-01") }));
  expect(events.toSorted(comparePhaseEventsNewestFirst).map(({ phase }) => phase)).toEqual(
    expected,
  );
  expect(
    events
      .toReversed()
      .sort(comparePhaseEventsNewestFirst)
      .map(({ phase }) => phase),
  ).toEqual(expected);
  expect(
    [...events, { phase: "Instruction" as const, timestamp: new Date("2025-02-02") }].sort(
      comparePhaseEventsNewestFirst,
    )[0].phase,
  ).toBe("Instruction");
});
