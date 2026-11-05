import { expect, test } from "vitest";
import { dossierMatchesSearch } from "./dossiersSearch.ts";
import { dossierId, makeContext, makeDossier } from "./testHelpers.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";

function espece(name: string): EspeceProtegee {
  return {
    CD_REF: "123",
    nomsVernaculaires: new Set([name]),
    nomsScientifiques: new Set(),
    classification: "faune non-oiseau",
    CD_TYPE_STATUTS: new Set(),
    espèceMinistérielle: undefined,
    espèceCNPN: undefined,
  };
}

test("a replaced summary refreshes cached names, comments and project details", () => {
  const original = Object.freeze(
    makeDossier({ name: "Marais", latestCommentaire: "Observations anciennes" }),
  );
  expect(dossierMatchesSearch(original, ["anciennes"], makeContext())).toBe(true);
  const refreshed = Object.freeze({
    ...original,
    name: "Prairie",
    latestCommentaire: "Observations nouvelles",
  });
  expect(dossierMatchesSearch(refreshed, ["nouvelles", "prairie"], makeContext())).toBe(true);
  expect(dossierMatchesSearch(refreshed, ["anciennes"], makeContext())).toBe(false);
});

test("cached summary text keeps following and species searches current", () => {
  const dossier = Object.freeze(makeDossier({ id: dossierId(1), especesImpacteesCD_REF: ["123"] }));
  const followers = new Map([["alice@example.fr", new Set([dossier.id])]]);
  const first = makeContext({ followRelations: followers });
  expect(dossierMatchesSearch(dossier, ["alice"], first)).toBe(true);
  followers.get("alice@example.fr")!.clear();
  followers.set("bob@example.fr", new Set([dossier.id]));
  expect(dossierMatchesSearch(dossier, ["alice"], first)).toBe(false);
  expect(dossierMatchesSearch(dossier, ["bob"], first)).toBe(true);
  const especeByCD_REF = new Map([["123", espece("Crapaud")]]);
  expect(dossierMatchesSearch(dossier, ["crapaud"], { ...first, especeByCD_REF })).toBe(true);
  const replaced = new Map([["123", espece("Grenouille")]]);
  expect(dossierMatchesSearch(dossier, ["crapaud"], { ...first, especeByCD_REF: replaced })).toBe(
    false,
  );
  expect(
    dossierMatchesSearch(dossier, ["grenouille"], { ...first, especeByCD_REF: replaced }),
  ).toBe(true);
});
