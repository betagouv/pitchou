import { expect, test, describe } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import { filterDossiers } from "./listModel.ts";
import { dossierId, makeQuery, makeDossier, makeContext } from "./testHelpers.ts";

function makeEspece(
  CD_REF: string,
  nomVernaculaire: string,
  nomScientifique: string,
): EspeceProtegee {
  return {
    CD_REF,
    nomsVernaculaires: new Set([nomVernaculaire]),
    nomsScientifiques: new Set([nomScientifique]),
    classification: "oiseau",
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceMinistérielle: undefined,
    espèceCNPN: undefined,
  };
}

describe("filterDossiers — filtre par espèce impactée", () => {
  test("keeps dossiers impacting any of the selected espèces, all of them when none is", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), especesImpacteesCD_REF: ["60630", "2938"] }),
      makeDossier({ id: dossierId(2), especesImpacteesCD_REF: ["2938"] }),
      makeDossier({ id: dossierId(3), especesImpacteesCD_REF: ["3571"] }),
      makeDossier({ id: dossierId(4), especesImpacteesCD_REF: [] }),
    ];
    const query = makeQuery({ espece: ["60630", "3571"] });
    expect(filterDossiers(dossiers, query, makeContext()).map((d) => d.id)).toEqual([1, 3]);
    expect(filterDossiers(dossiers, makeQuery(), makeContext())).toHaveLength(4);
  });
});

describe("recherche par espèce impactée", () => {
  const especeByCD_REF = new Map([
    ["2938", makeEspece("2938", "Aigle royal", "Aquila chrysaetos")],
    ["3571", makeEspece("3571", "Martin-pêcheur d'Europe", "Alcedo atthis")],
  ]);

  /** Ids kept by the text search, with the espèces référentiel loaded */
  function searchEspeces(text: string, dossiers: DossierSummary[]): number[] {
    return filterDossiers(dossiers, makeQuery({ text }), makeContext({ especeByCD_REF }))
      .map((d) => d.id)
      .sort((a, b) => a - b);
  }

  const dossiers = () => [
    makeDossier({ id: dossierId(1), especesImpacteesCD_REF: ["2938"], departments: ["24"] }),
    makeDossier({ id: dossierId(2), especesImpacteesCD_REF: ["3571"], departments: ["33"] }),
    makeDossier({ id: dossierId(3), especesImpacteesCD_REF: [] }),
  ];

  test("trouve un dossier par le nom vernaculaire de l'espèce impactée", () => {
    expect(searchEspeces("aigle royal", dossiers())).toEqual([1]);
  });

  test("trouve un dossier par le nom scientifique de l'espèce impactée", () => {
    expect(searchEspeces("alcedo", dossiers())).toEqual([2]);
  });

  test("croise l'espèce avec un autre champ", () => {
    expect(searchEspeces("24 aigle", dossiers())).toEqual([1]);
    expect(searchEspeces("33 aigle", dossiers())).toEqual([]);
  });

  test("ne trouve rien tant que le référentiel n'est pas chargé", () => {
    const found = filterDossiers(dossiers(), makeQuery({ text: "aigle" }), makeContext());
    expect(found).toEqual([]);
  });
});
