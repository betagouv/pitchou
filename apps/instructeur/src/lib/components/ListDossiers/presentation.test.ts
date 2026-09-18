import { expect, test } from "vitest";
import { applicantName } from "./presentation.ts";
import { dossierIsFollowed } from "./filtering.ts";
import { dossierId, makeDossier } from "./testHelpers.ts";

test("applicant names omit SIRET, including when the legal name is absent", () => {
  expect(
    applicantName(
      makeDossier({
        demandeur_personne_morale_siret: "12345678900012",
        demandeur_personne_morale_legal_name: "Association des marais",
      }),
    ),
  ).toBe("Association des marais");
  expect(
    applicantName(
      makeDossier({
        demandeur_personne_morale_siret: "12345678900012",
      }),
    ),
  ).toBe("(non renseigné)");
  expect(
    applicantName(
      makeDossier({
        demandeur_personne_morale_legal_name: "Association des marais",
      }),
    ),
  ).toBe("Association des marais");
});

test("applicant names handle missing names and retain the deposant fallback", () => {
  expect(applicantName(makeDossier())).toBe("(non renseigné)");
  expect(applicantName(makeDossier({ demandeur_personne_physique_last_name: "Martin" }))).toBe(
    "Martin",
  );
  expect(applicantName(makeDossier({ demandeur_personne_physique_first_names: "Jeanne" }))).toBe(
    "Jeanne",
  );
  expect(
    applicantName(makeDossier({ deposant_last_name: "Martin", deposant_first_names: "Jeanne" })),
  ).toBe("Martin Jeanne");
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
