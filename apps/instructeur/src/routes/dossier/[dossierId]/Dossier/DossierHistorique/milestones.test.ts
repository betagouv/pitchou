import { expect, test } from "vitest";
import { fakeDossierFull } from "../../../../fakeDossier.ts";
import { milestoneEntries } from "./milestones.ts";

test("an Onagre dossier with only a DDEP day has no invented first-deposit milestone or time", () => {
  const entries = milestoneEntries(
    fakeDossierFull({
      source: "onagre",
      depot_date: null,
      ddep_depot_date: new Date(2026, 6, 15),
    }),
  );
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    label: "Dépôt du DDEP",
    date: new Date(2026, 6, 15),
    timeKnown: false,
  });
});
