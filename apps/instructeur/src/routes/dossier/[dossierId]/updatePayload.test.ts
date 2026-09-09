import { expect, test } from "vitest";
import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { parseDossierUpdate } from "./updatePayload.ts";

const DOSSIER_ID = 123 as DossierId;

test.each([...prochaineActionAttenduePar, null])(
  "accepts entity %s and clears the retired task",
  (entity) => {
    expect(parseDossierUpdate({ next_action_expected_from: entity }, DOSSIER_ID)).toEqual({
      next_action_expected_from: entity,
      next_action_expected: null,
    });
  },
);

test.each(["Autre administration", "Autre", "Personne", "Préfet·e", "Instructeur-ice (Moi)"])(
  "rejects retired or display-only entity %s",
  (entity) => {
    expect(() => parseDossierUpdate({ next_action_expected_from: entity }, DOSSIER_ID)).toThrow();
  },
);

test.each([
  "Envoyer la saisine",
  "Consulter le dossier",
  "Compléter le dossier",
  "Signer l'arrêté",
])("rejects retired task %s", (task) => {
  expect(() => parseDossierUpdate({ next_action_expected: task }, DOSSIER_ID)).toThrow();
});

test("accepts an explicit task clear", () => {
  expect(parseDossierUpdate({ next_action_expected: null }, DOSSIER_ID)).toEqual({
    next_action_expected: null,
  });
});

test("unrelated updates do not clear a stored task or other fields", () => {
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
