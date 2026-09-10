import { expect, test } from "vitest";
import { nouvellesModifications } from "./modifications.ts";
import type { FieldChange } from "@pitchou/types/notification.ts";
import { speciesImpactChangeField } from "@pitchou/common/especes/impactGroup.ts";

const change = (field: string): FieldChange => ({
  field,
  label: field,
  revisions: [],
  detected_at: new Date(),
  modified_at: null,
});

test("groups pending revisions by accordion, keeping files separate", () => {
  const changes = [
    "Description",
    "Mandataire",
    "Entreprise",
    "especes",
    "piece:one",
    "piece:two",
  ].map(change);
  const result = nouvellesModifications(changes);
  expect([...result.fieldDates.keys()]).toEqual(["Description"]);
  expect([...result.porteurDates.keys()]).toEqual(["Mandataire", "Entreprise"]);
  expect(result.especes).toBe(changes[3]);
  expect(result.piecesJointes).toEqual(changes.slice(4));
});

test("an accordion has no badge once its last revision is acknowledged", () => {
  const remaining = nouvellesModifications([change("Description")]);
  expect(remaining.porteurDates.size).toBe(0);
  expect(remaining.piecesJointes).toEqual([]);
  expect(remaining.especes).toBeUndefined();
  expect(nouvellesModifications([]).fieldDates.size).toBe(0);
});

test("property-level identity and company revisions belong to the porteur accordion", () => {
  const fields = [
    "demandeur.email",
    "mandataire.last_name",
    "representant.phone",
    "entreprise.address",
  ];
  const result = nouvellesModifications([...fields, "Description"].map(change));
  expect([...result.porteurDates.keys()]).toEqual(fields);
  expect([...result.fieldDates.keys()]).toEqual(["Description"]);
});

test("species group keys stay separate from project fields and legacy species changes", () => {
  const first = change(speciesImpactChangeField("P-1"));
  const unspecified = change(speciesImpactChangeField(null));
  const coarse = change("especes");
  const result = nouvellesModifications([first, unspecified, coarse, change("Description")]);
  expect([...result.especesGroups]).toEqual([
    ["P-1", first],
    [null, unspecified],
  ]);
  expect(result.especes).toBe(coarse);
  expect([...result.fieldDates.keys()]).toEqual(["Description"]);
});
