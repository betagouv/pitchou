import { expect, test } from "vitest";
import { impactColumns, impactGroups } from "./impactGroups.ts";
import { groupChange, habitat, impact } from "./impactGroups.fixture.ts";

test("groups by exact impact ID, not species taxonomy or identical labels", () => {
  const first = impact();
  const otherSpecies = impact({
    espece: { ...first.espece, CD_REF: "2", nomScientifique: "Abies" },
  });
  const otherId = impact({ typeImpact: { ...first.typeImpact!, identifiantPitchou: "P-10" } });
  const groups = impactGroups([first, otherId, habitat, otherSpecies, first], new Map());
  expect(groups.map(({ id }) => id)).toEqual(["P-1", "P-10", "P-4-2"]);
  expect(groups[0].impacts).toEqual([otherSpecies, first, first]);
  expect(groups[1].label).toBe(groups[0].label);
});

test("binds independent changes including deleted and unspecified groups", () => {
  const changed = groupChange("P-1");
  const deleted = groupChange("P-3", "Capture/relâcher immédiat");
  const unspecified = groupChange(null);
  const groups = impactGroups(
    [impact(), habitat, impact({ typeImpact: null })],
    new Map([
      ["P-1", changed],
      ["P-3", deleted],
      [null, unspecified],
    ]),
  );
  expect(groups.map(({ change }) => change)).toEqual([changed, undefined, unspecified, deleted]);
  expect(groups[3]).toEqual({ id: "P-3", label: deleted.label, impacts: [], change: deleted });
});

test("keeps allowed criteria and any supplied values including zero, methods and means", () => {
  const row = impact({ nids: 0, oeufs: 2, methode: "Filets", moyenDePoursuite: "Avion" });
  expect(impactColumns([row, habitat]).map(({ key }) => key)).toEqual([
    "nombreIndividus",
    "surfaceHabitatDetruit",
    "nids",
    "oeufs",
    "methode",
    "moyenDePoursuite",
  ]);
  expect(impactColumns([impact({ typeImpact: null, nombreIndividus: null })])).toEqual([]);
  expect(impactColumns([impact({ nombreIndividus: null })]).map(({ label }) => label)).toEqual([
    "Nb d’individus",
  ]);
});
