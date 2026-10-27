import { expect, test } from "vitest";
import { fakeDossierFull } from "../../../routes/fakeDossier.ts";
import { formatDossierFull } from "./formatDossierFull.ts";

test.each([
  "intervention_start_date",
  "intervention_end_date",
  "commissioning_date",
  "depot_date",
  "ddep_depot_date",
  "public_consultation_start_date",
  "public_consultation_end_date",
  "next_due_date",
] as const)("deserializes %s before freezing the dossier", (key) => {
  const date = new Date("2026-09-10");
  const payload = JSON.parse(JSON.stringify(fakeDossierFull({ [key]: date })));

  const dossier = formatDossierFull(payload);

  expect(dossier[key]).toBeInstanceOf(Date);
  expect(dossier[key]).toEqual(date);
  expect(Object.isFrozen(dossier)).toBe(true);
});

test.each([null, undefined])("preserves an absent commissioning date: %s", (commissioning_date) => {
  const payload = JSON.parse(JSON.stringify(fakeDossierFull({ commissioning_date })));

  expect(formatDossierFull(payload).commissioning_date).toBe(commissioning_date);
});

test("loads a DDEP calendar day in local time and preserves missing dates", () => {
  const payload = JSON.parse(JSON.stringify(fakeDossierFull({ depot_date: null })));
  payload.ddep_depot_date = "2026-07-15";
  expect(formatDossierFull(payload).ddep_depot_date).toEqual(new Date(2026, 6, 15));
  const unknown = formatDossierFull(fakeDossierFull({ depot_date: null, ddep_depot_date: null }));
  expect(unknown.depot_date).toBeNull();
  expect(unknown.ddep_depot_date).toBeNull();
});
