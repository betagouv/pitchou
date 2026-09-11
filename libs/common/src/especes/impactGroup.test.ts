import { expect, test } from "vitest";
import { parseSpeciesImpactChangeField, speciesImpactChangeField } from "./impactGroup.ts";

test.each(["P-2-1", "P-70-2", null])("round-trips impact group %s", (impactType) => {
  expect(speciesImpactChangeField(impactType)).toBe(
    `especes:impact_type:${impactType ?? "unspecified"}`,
  );
  expect(parseSpeciesImpactChangeField(speciesImpactChangeField(impactType))).toBe(impactType);
});

test.each(["especes", "piece:123", "especes:impact_type:"])("%s is not a group revision", (field) =>
  expect(parseSpeciesImpactChangeField(field)).toBeUndefined(),
);
