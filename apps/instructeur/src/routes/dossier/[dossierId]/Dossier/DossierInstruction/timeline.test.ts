import { describe, expect, test } from "vitest";
import { timelineSteps } from "./timeline.ts";

const DEPOT = new Date("2025-09-01");

describe("timelineSteps", () => {
  test("a dossier without phase events is in Accompagnement amont", () => {
    const steps = timelineSteps([], DEPOT);
    expect(steps.map(({ label, state }) => [label, state])).toEqual([
      ["Dépôt", "done"],
      ["Accompagnement amont", "current"],
      ["Étude recevabilité", "future"],
      ["Instruction", "future"],
      ["Contrôle", "future"],
      ["Obligations terminées", "future"],
    ]);
    expect(steps[0].detail).toEqual(["Le 01/09/2025"]);
    expect(steps[1].detail).toEqual(["Depuis le 01/09/2025"]);
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
    expect(steps[1].detail).toEqual(["01/09/2025 → 17/06/2026"]);
  });

  test("a phase visited twice shows two periods", () => {
    const steps = timelineSteps(
      [
        { phase: "Instruction", timestamp: new Date("2026-06-17") },
        { phase: "Accompagnement amont", timestamp: new Date("2026-04-01") },
        { phase: "Étude recevabilité", timestamp: new Date("2025-12-15") },
        { phase: "Accompagnement amont", timestamp: new Date("2025-09-01") },
      ],
      DEPOT,
    );
    expect(steps[1].detail).toEqual(["01/09/2025 → 15/12/2025", "01/04/2026 → 17/06/2026"]);
    expect(steps[1].state).toBe("done");
    expect(steps[3].state).toBe("current");
  });

  test("the canonical recevabilite phase is current", () => {
    const steps = timelineSteps(
      [{ phase: "Étude recevabilité", timestamp: new Date("2025-12-15") }],
      DEPOT,
    );
    expect(steps[2]).toEqual({
      label: "Étude recevabilité",
      state: "current",
      detail: ["Depuis le 15/12/2025"],
    });
    expect(steps[1].state).toBe("done");
    expect(steps[3].state).toBe("future");
  });

  test("an implicit initial accompagnement and a later return have distinct dates", () => {
    const events = [
      { phase: "Accompagnement amont" as const, timestamp: new Date("2026-04-01") },
      { phase: "Étude recevabilité" as const, timestamp: new Date("2025-12-15") },
    ];
    const steps = timelineSteps(events, DEPOT);
    expect(steps[1].detail).toEqual(["01/09/2025 → 15/12/2025", "Depuis le 01/04/2026"]);
    expect(steps[1].state).toBe("current");
    expect(events).toHaveLength(2);
  });

  test("an explicit initial event keeps its actual date", () => {
    expect(
      timelineSteps([{ phase: "Accompagnement amont", timestamp: "2025-09-12" }], DEPOT)[1].detail,
    ).toEqual(["Depuis le 12/09/2025"]);
  });

  test("an absent deposit date does not invent a phase date", () => {
    expect(timelineSteps([], null)[1].detail).toEqual([]);
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
    expect(steps[3].detail).toEqual(["01/01/2026 → 01/02/2026"]);
    expect(steps[4].state).toBe("not_reached");
    expect(steps[5].state).toBe("not_reached");
  });

  test("classification in accompagnement does not complete the subsequent phases", () => {
    const steps = timelineSteps([{ phase: "Classé sans suite", timestamp: "2026-02-01" }], DEPOT);
    expect(steps.map(({ state }) => state)).toEqual([
      "done",
      "done",
      "not_reached",
      "not_reached",
      "not_reached",
      "not_reached",
    ]);
  });

  test("classification keeps phases reached before a return completed", () => {
    const steps = timelineSteps(
      [
        { phase: "Classé sans suite", timestamp: "2026-03-01" },
        { phase: "Instruction", timestamp: "2026-02-01" },
        { phase: "Contrôle", timestamp: "2026-01-01" },
      ],
      DEPOT,
    );
    expect(steps[4].state).toBe("done");
    expect(steps[5].state).toBe("not_reached");
  });

  test("reopening a classified dossier restores normal timeline states", () => {
    const steps = timelineSteps(
      [
        { phase: "Instruction", timestamp: "2026-03-01" },
        { phase: "Classé sans suite", timestamp: "2026-02-01" },
      ],
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
  });

  test("classification without deposit or prior phase dates does not invent progress", () => {
    const steps = timelineSteps([{ phase: "Classé sans suite", timestamp: "2026-02-01" }], null);
    expect(steps.slice(1).every(({ state }) => state === "not_reached")).toBe(true);
    expect(steps.every(({ detail }) => detail.length === 0)).toBe(true);
  });

  test("classification after obligations ended preserves their completion", () => {
    const steps = timelineSteps(
      [
        { phase: "Classé sans suite", timestamp: "2026-03-01" },
        { phase: "Obligations terminées", timestamp: "2026-02-01" },
      ],
      DEPOT,
    );
    expect(steps.every(({ state }) => state === "done")).toBe(true);
  });
});
