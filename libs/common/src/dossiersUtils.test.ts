import { expect, test } from "vitest";
import { DossierFullToDossierSummary } from "./dossiersUtils.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const full = {
  id: 1,
  name: "Demande title",
  projet: { id: "project-1", name: "Shared project", demandeLabel: "Demande A", count: 2 },
  evenementsPhase: [],
  avisExpert: [],
  acteurs: [],
  especesImpactees: { impacts: [] },
} as unknown as DossierFull;

test("loading a full demande retains project grouping in its list summary", () => {
  const summary = DossierFullToDossierSummary(full);
  expect(summary.projet).toEqual(full.projet);
});

test("fresh full payloads propagate changed or removed project memberships", () => {
  const changed = { ...full, projet: { ...full.projet!, demandeLabel: "Updated", count: 3 } };
  expect(DossierFullToDossierSummary(changed).projet).toEqual(changed.projet);
  expect(DossierFullToDossierSummary({ ...full, projet: null }).projet).toBeNull();
});
