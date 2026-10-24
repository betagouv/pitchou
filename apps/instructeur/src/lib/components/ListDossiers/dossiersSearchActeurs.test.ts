import { expect, test } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossierActeur, Involvement } from "@pitchou/types/dossierActeur.ts";
import { searchableText } from "./listModel.ts";
import { makeDossier, makeContext } from "./testHelpers.ts";

function acteur(
  involvements: Involvement[],
  last_name: string,
  first_names: string,
): DossierActeur {
  return {
    involvements,
    last_name,
    first_names,
    email: null,
    address: null,
    phone: null,
    role: null,
  };
}

const dossier = (id: number, acteurs: DossierActeur[]) =>
  makeDossier({ id, acteurs } as Partial<DossierSummary>);

test("the dossiers list search matches the déposants and mandataires, not the other acteurs", () => {
  const text = searchableText(
    dossier(1, [
      acteur(["mandataire", "deposant"], "Rousseau", "Jean-Baptiste"),
      acteur(["beneficiaire_demarche_numerique"], "Durand", "Élise"),
      acteur(["personne_contact"], "Leroy", "Anne"),
    ]),
    makeContext(),
  );
  expect(text).toContain("rousseau");
  expect(text).toContain("jean-baptiste");
  for (const other of ["durand", "elise", "leroy"]) expect(text).not.toContain(other);
});
