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
