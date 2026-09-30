import { expect, test } from "vitest";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import { filterEspeces, parseEspecesQuery } from "@pitchou/ui/especes/especesList.ts";

const base: EspeceProtegee = {
  CD_REF: "1",
  classification: "oiseau",
  CD_TYPE_STATUTS: new Set(["PN"]),
  nomsScientifiques: new Set(["Morus bassanus"]),
  nomsVernaculaires: new Set(["Fou de Bassan"]),
  espèceCNPN: "O",
  espèceMinistérielle: undefined,
};
const especes: EspeceProtegee[] = [
  { ...base, statutListeRouge: "CR" },
  { ...base, CD_REF: "2", statutListeRouge: "EN" },
  { ...base, CD_REF: "3", statutListeRouge: "VU", classification: "flore" },
  { ...base, CD_REF: "4" },
];

test.each([
  ["CR", 0],
  ["EN", 1],
  ["VU", 2],
] as const)("filters the %s badge without including unclassified species", (uicn, index) => {
  const query = parseEspecesQuery(new URLSearchParams({ uicn }));
  expect(filterEspeces(especes, query)).toEqual([especes[index]]);
});

test("combines UICN with protection, classification, CNPN and text search", () => {
  const query = parseEspecesQuery(
    new URLSearchParams({
      uicn: "EN",
      statut: "PN",
      classification: "oiseau",
      liste: "cnpn",
      q: "fou",
    }),
  );
  expect(filterEspeces(especes, query)).toEqual([especes[1]]);
  expect(filterEspeces(especes, { ...query, statut: "PR" })).toEqual([]);
});

test.each(["", "invalid", "LC"])("ignores unsupported UICN filters: %s", (uicn) => {
  const query = parseEspecesQuery(new URLSearchParams({ uicn }));
  expect(query.uicn).toBe("");
  expect(filterEspeces(especes, query)).toEqual(especes);
});
