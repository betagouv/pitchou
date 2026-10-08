import { expect, test } from "vitest";
import { applicantName } from "./presentation.ts";
import { dossierIsFollowed } from "./filtering.ts";
import { dossierId, makeDossier } from "./testHelpers.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

const morale = (legal_name: string | null) =>
  makeDossier({
    porteur_de_projet: { type: "personne_morale", siret: "12345678900012", legal_name },
  } as Partial<DossierSummary>);
const physique = (last_name: string | null, first_names: string | null) =>
  makeDossier({
    porteur_de_projet: { type: "personne_physique", last_name, first_names },
  } as Partial<DossierSummary>);

test("applicant names show the porteur de projet without its SIRET", () => {
  expect(applicantName(morale("Association des marais"))).toBe("Association des marais");
  expect(applicantName(morale(null))).toBe("Non renseigné");
  expect(applicantName(physique("Martin", "Jeanne"))).toBe("Martin Jeanne");
  expect(applicantName(physique("Martin", null))).toBe("Martin");
  expect(applicantName(physique(null, "Jeanne"))).toBe("Jeanne");
});

test("applicant names do not fall back on the deposant without porteur", () => {
  expect(applicantName(makeDossier())).toBe("Non renseigné");
  expect(
    applicantName(makeDossier({ deposant_last_name: "Martin", deposant_first_names: "Jeanne" })),
  ).toBe("Non renseigné");
});

test("unassigned status checks every loaded follower, not only the current user", () => {
  const relations = new Map([
    ["me@example.org", new Set([dossierId(1)])],
    ["colleague@example.org", new Set([dossierId(2)])],
  ]);
  expect(dossierIsFollowed(dossierId(1), relations)).toBe(true);
  expect(dossierIsFollowed(dossierId(2), relations)).toBe(true);
  expect(dossierIsFollowed(dossierId(3), relations)).toBe(false);
  relations.get("colleague@example.org")?.delete(dossierId(2));
  expect(dossierIsFollowed(dossierId(2), relations)).toBe(false);
});
