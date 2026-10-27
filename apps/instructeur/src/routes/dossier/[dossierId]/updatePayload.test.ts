import { expect, test } from "vitest";
import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { parseDossierUpdate } from "./updatePayload.ts";

const DOSSIER_ID = 123 as DossierId;

test.each([...prochaineActionAttenduePar, null])(
  "accepts entity %s without adding unrelated fields",
  (entity) => {
    expect(parseDossierUpdate({ next_action_expected_from: entity }, DOSSIER_ID)).toEqual({
      next_action_expected_from: entity,
    });
  },
);

test.each(["Autre administration", "Autre", "Personne", "Préfet·e", "Instructeur-ice (Moi)"])(
  "rejects retired or display-only entity %s",
  (entity) => {
    expect(() => parseDossierUpdate({ next_action_expected_from: entity }, DOSSIER_ID)).toThrow();
  },
);

test.each(["Envoyer la saisine", null])("rejects the removed task field with value %s", (task) => {
  expect(() => parseDossierUpdate({ next_action_expected: task }, DOSSIER_ID)).toThrow();
});

test("unrelated updates do not add fields", () => {
  expect(parseDossierUpdate({ enjeu: true }, DOSSIER_ID)).toEqual({ enjeu: true });
  expect(parseDossierUpdate({}, DOSSIER_ID)).toEqual({});
});

test("accepts the canonical recevabilite phase, not its retired name", () => {
  const event = { dossier: DOSSIER_ID, phase: "Étude recevabilité", timestamp: "2026-04-01" };
  expect(
    parseDossierUpdate({ evenementsPhase: [event] }, DOSSIER_ID).evenementsPhase?.[0],
  ).toMatchObject({ phase: "Étude recevabilité", timestamp: new Date("2026-04-01") });
  expect(() =>
    parseDossierUpdate(
      { evenementsPhase: [{ ...event, phase: "Étude recevabilité DDEP" }] },
      DOSSIER_ID,
    ),
  ).toThrow();
});

test.each(["2025-02-29", "2026-04-31", "2026-13-01", "", "yesterday", "2026-01-01T23:00:00Z"])(
  "rejects an invalid DDEP calendar day %s",
  (ddep_depot_date) => {
    expect(() => parseDossierUpdate({ ddep_depot_date }, DOSSIER_ID)).toThrow();
  },
);

test("sets or clears the DDEP day without changing the initial deposit", () => {
  expect(parseDossierUpdate({ ddep_depot_date: "2024-02-29" }, DOSSIER_ID)).toEqual({
    ddep_depot_date: new Date(2024, 1, 29),
  });
  expect(parseDossierUpdate({ ddep_depot_date: null }, DOSSIER_ID)).toEqual({
    ddep_depot_date: null,
  });
});
