import { expect, test } from "vitest";
import { summaryActeurs } from "./dossierActeur.ts";
import type { DossierActeur } from "@pitchou/types/dossierActeur.ts";

const personne = {
  first_names: "Jean",
  last_name: "Dupont",
  email: null,
  address: null,
  phone: null,
  role: null,
};

test("the dossiers list keeps only the déposants and mandataires, with these involvements only", () => {
  const acteurs: DossierActeur[] = [
    { involvements: ["beneficiaire_demarche_numerique", "deposant"], ...personne },
    { involvements: ["mandataire"], ...personne, last_name: "Martin" },
    { involvements: ["personne_contact"], ...personne, last_name: "Leroy" },
  ];
  expect(summaryActeurs(acteurs)).toEqual([
    { involvements: ["deposant"], ...personne },
    { involvements: ["mandataire"], ...personne, last_name: "Martin" },
  ]);
});
