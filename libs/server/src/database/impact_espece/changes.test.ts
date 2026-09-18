import { expect, test } from "vitest";
import { changedImpactTypes } from "./changes.ts";
import { fromFileToDatabaseImpactEspeceRow } from "./rows.ts";
import type ImpactEspece from "@pitchou/types/database/public/ImpactEspece.ts";
import type { DescriptionMenacesEspeces } from "@pitchou/types/especesImpact.d.ts";

function impact(type: string | null = "P-2-1", values: Partial<ImpactEspece> = {}): ImpactEspece {
  return {
    cd_ref: "2437",
    classification: "oiseau",
    impact_type: type,
    impact_methode: null,
    impact_moyen_de_poursuite: null,
    nombre_individus: "11-100",
    nids: null,
    oeufs: null,
    surface_habitat_detruit: null,
    ...values,
  } as ImpactEspece;
}

test("reordering and technical row identity do not change groups", () => {
  const rows = [impact(), impact("P-4-2"), impact("P-2-1", { cd_ref: "other" })];
  expect(
    changedImpactTypes(
      rows,
      rows.toReversed().map(
        (row) =>
          ({
            ...row,
            id: "new",
            source_file: "new-file",
            created_at: new Date(),
            updated_at: new Date(),
          }) as ImpactEspece,
      ),
    ),
  ).toEqual([]);
});

test.each([
  "nombre_individus",
  "nids",
  "oeufs",
  "surface_habitat_detruit",
  "impact_methode",
  "impact_moyen_de_poursuite",
  "cd_ref",
  "classification",
] as const)("only the group containing a changed %s is reported", (column) => {
  const rows = [impact(), impact("P-4-2")];
  const value = ["nids", "oeufs", "surface_habitat_detruit"].includes(column) ? 0 : "changed";
  expect(changedImpactTypes(rows, [{ ...rows[0], [column]: value }, rows[1]])).toEqual(["P-2-1"]);
});

test("additions, removals and moves include groups absent from either snapshot", () => {
  expect(changedImpactTypes([], [impact()])).toEqual(["P-2-1"]);
  expect(changedImpactTypes([impact()], [])).toEqual(["P-2-1"]);
  expect(changedImpactTypes([impact()], [impact("P-4-2")])).toEqual(["P-2-1", "P-4-2"]);
  expect(changedImpactTypes([impact(null)], [])).toEqual([null]);
});

test("adding or removing a species within a surviving group changes that group", () => {
  const rows = [impact(), impact("P-2-1", { cd_ref: "other" }), impact("P-4-2")];
  expect(changedImpactTypes(rows, [rows[0], rows[2]])).toEqual(["P-2-1"]);
  expect(changedImpactTypes([rows[0], rows[2]], rows)).toEqual(["P-2-1"]);
});

test("comparison preserves duplicate multiplicity", () => {
  expect(changedImpactTypes([impact(), impact()], [impact()])).toEqual(["P-2-1"]);
  expect(changedImpactTypes([impact()], [impact(), impact()])).toEqual(["P-2-1"]);
});

test("file normalization agrees with persisted values and preserves zero", () => {
  const fileRows = fromFileToDatabaseImpactEspeceRow(
    {
      oiseau: [
        {
          espèce: { CD_REF: "2437" },
          activité: { "Identifiant Pitchou": "P-2-1" },
          nombreIndividus: "11-100",
          nombreNids: "0",
          nombreOeufs: 0,
          surfaceHabitatDétruit: "4.4",
        },
      ],
      "faune non-oiseau": [],
      flore: [],
    } as unknown as DescriptionMenacesEspeces,
    1 as ImpactEspece["dossier"],
    "file" as ImpactEspece["source_file"],
  );
  expect(
    changedImpactTypes(
      [impact("P-2-1", { nids: 0, oeufs: 0, surface_habitat_detruit: 4 })],
      fileRows as ImpactEspece[],
    ),
  ).toEqual([]);
});
