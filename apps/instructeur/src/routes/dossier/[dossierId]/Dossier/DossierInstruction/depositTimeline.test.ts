import { expect, test } from "vitest";
import { timelineSteps } from "./timeline.ts";
const DEPOT = new Date("2025-09-01");

test("Onagre starts at DDEP and does not infer preliminary phases", () => {
  const steps = timelineSteps(
    [{ phase: "Instruction", timestamp: "2025-10-01" }],
    null,
    "2025-09-15",
    "onagre",
  );
  expect(steps.map(({ label }) => label)).toEqual([
    "Dépôt du DDEP",
    "Instruction",
    "Contrôle",
    "Obligations terminées",
  ]);
  expect(steps[0]).toMatchObject({ state: "done", detail: ["Le 15/09/2025"] });
  expect(steps[1]).toMatchObject({ state: "current", detail: ["Depuis le 01/10/2025"] });
});

test("an unknown deposit is omitted and a DDEP date does not create a phase event", () => {
  const steps = timelineSteps([], null, "2025-09-15", "onagre");
  expect(steps.filter(({ state }) => state === "done").map(({ label }) => label)).toEqual([
    "Dépôt du DDEP",
  ]);
  expect(steps.some(({ state }) => state === "current")).toBe(false);
  expect(timelineSteps([], null).some(({ label }) => label === "Dépôt")).toBe(false);
});

test("a DDEP milestone keeps both the first solicitation and explicit preliminary history", () => {
  const events = [{ phase: "Étude recevabilité" as const, timestamp: "2025-09-20" }];
  expect(timelineSteps(events, DEPOT, "2025-09-15").map(({ label }) => label)).toEqual([
    "Dépôt",
    "Accompagnement amont",
    "Dépôt du DDEP",
    "Étude recevabilité",
    "Instruction",
    "Contrôle",
    "Obligations terminées",
  ]);
  expect(
    timelineSteps(events, null, "2025-09-15", "onagre").find(
      ({ label }) => label === "Étude recevabilité",
    )?.state,
  ).toBe("current");
});
