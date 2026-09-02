import { describe, expect, test } from "vitest";
import { timelineSteps } from "./timeline.ts";

const DEPOT = new Date("2025-09-01");

describe("timelineSteps", () => {
  test("a dossier without phase events is in Accompagnement amont", () => {
    const steps = timelineSteps([], DEPOT);
    expect(steps.map(({ label, state }) => [label, state])).toEqual([
      ["Dépôt", "done"],
      ["Accompagnement amont", "current"],
      ["Étude recevabilité DDEP", "future"],
      ["Instruction", "future"],
      ["Contrôle", "future"],
      ["Obligations terminées", "future"],
    ]);
    expect(steps[0].detail).toEqual(["Le 01/09/2025"]);
  });

  test("phases before the current one are done, even when skipped", () => {
    const steps = timelineSteps(
      [{ phase: "Instruction", timestamp: new Date("2026-06-17") }],
      DEPOT,
    );
    expect(steps.map(({ state }) => state)).toEqual([
      "done",
      "done",
      "done",
      "current",
      "future",
      "future",
    ]);
    expect(steps[3].detail).toEqual(["Depuis le 17/06/2026"]);
  });

  test("a phase visited twice shows two periods", () => {
    const steps = timelineSteps(
      [
        { phase: "Instruction", timestamp: new Date("2026-06-17") },
        { phase: "Accompagnement amont", timestamp: new Date("2026-04-01") },
        { phase: "Étude recevabilité DDEP", timestamp: new Date("2025-12-15") },
        { phase: "Accompagnement amont", timestamp: new Date("2025-09-01") },
      ],
      DEPOT,
    );
    expect(steps[1].detail).toEqual(["01/09/2025 → 15/12/2025", "01/04/2026 → 17/06/2026"]);
    expect(steps[1].state).toBe("done");
    expect(steps[3].state).toBe("current");
  });

  test("a dossier classé sans suite shows no current phase", () => {
    const steps = timelineSteps(
      [
        { phase: "Classé sans suite", timestamp: new Date("2026-02-01") },
        { phase: "Instruction", timestamp: new Date("2026-01-01") },
      ],
      DEPOT,
    );
    expect(steps.every(({ state }) => state !== "current")).toBe(true);
    expect(steps[3].state).toBe("done");
  });
});
