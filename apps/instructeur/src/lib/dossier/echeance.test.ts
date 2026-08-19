import { describe, expect, test } from "vitest";
import { describeEcheance } from "./echeance.ts";

const today = new Date("2026-08-09T10:00:00");

describe("describeEcheance", () => {
  test("returns nothing without a date", () => {
    expect(describeEcheance(null, today)).toBeUndefined();
    expect(describeEcheance(undefined, today)).toBeUndefined();
    expect(describeEcheance("not a date", today)).toBeUndefined();
  });

  test("is blue from 9 days away", () => {
    expect(describeEcheance(new Date("2026-08-18T00:00:00"), today)).toEqual({
      daysLeft: 9,
      label: "Échéance J-9",
      urgency: "info",
    });
    expect(describeEcheance(new Date("2026-08-19T00:00:00"), today)?.urgency).toBe("info");
  });

  test("is orange from 8 days away down to the eve", () => {
    expect(describeEcheance(new Date("2026-08-17T23:00:00"), today)).toEqual({
      daysLeft: 8,
      label: "Échéance J-8",
      urgency: "warning",
    });
    expect(describeEcheance(new Date("2026-08-10T00:00:00"), today)).toEqual({
      daysLeft: 1,
      label: "Échéance J-1",
      urgency: "warning",
    });
  });

  test("is red on the day of the échéance, whatever the time", () => {
    expect(describeEcheance(new Date("2026-08-09T23:59:00"), today)).toEqual({
      daysLeft: 0,
      label: "Échéance jour J",
      urgency: "error",
    });
    expect(describeEcheance(new Date("2026-08-09T00:00:00"), today)).toEqual({
      daysLeft: 0,
      label: "Échéance jour J",
      urgency: "error",
    });
  });

  test("is red and counts the delay once the échéance has passed", () => {
    expect(describeEcheance(new Date("2026-08-06T00:00:00"), today)).toEqual({
      daysLeft: -3,
      label: "Retard J+3",
      urgency: "error",
    });
  });

  test("accepts a date string", () => {
    expect(describeEcheance("2026-08-06", today)?.label).toBe("Retard J+3");
  });
});
