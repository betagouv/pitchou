import { describe, it, expect } from "vitest";
import { createOdsFile } from "@odfjs/odfjs";
import * as XLSX from "xlsx";

import {
  dbRowToEspeceProtegee,
  importDescriptionMenacesEspècesFromOdsArrayBuffer,
} from "./outils-espèces.ts";
import type { default as EspeceProtegee } from "@pitchou/types/database/public/EspeceProtegee.ts";
import type {
  EspèceProtégée,
  ParClassification,
  ActivitéMenançante,
  MéthodeMenançante,
  MoyenDePoursuiteMenaçant,
} from "@pitchou/types/especes.d.ts";

// Builds a raw `espece_protegee` row. cd_ref is a branded string in the generated
// type, so the literal is cast through `as` for the test.
function makeRow(overrides: Partial<EspeceProtegee> = {}): EspeceProtegee {
  return {
    cd_ref: "2437",
    classification: "oiseau",
    noms_scientifiques: ["Morus bassanus", "Sula bassana"],
    noms_vernaculaires: ["Fou de Bassan"],
    cd_type_statuts: ["PN"],
    espece_ministerielle: false,
    espece_cnpn: false,
    ...overrides,
  } as EspeceProtegee;
}

describe("dbRowToEspeceProtegee", () => {
  it("turns the text[] columns into Sets, preserving order", () => {
    const espece = dbRowToEspeceProtegee(makeRow());

    expect(espece.CD_REF).toBe("2437");
    expect(espece.classification).toBe("oiseau");
    expect(espece.nomsScientifiques).toEqual(new Set(["Morus bassanus", "Sula bassana"]));
    // The valid name comes first in the array; the Set keeps insertion order.
    expect([...espece.nomsScientifiques][0]).toBe("Morus bassanus");
    expect(espece.nomsVernaculaires).toEqual(new Set(["Fou de Bassan"]));
    expect(espece.CD_TYPE_STATUTS).toEqual(new Set(["PN"]));
  });

  it('maps the boolean flags to "O" when true', () => {
    const espece = dbRowToEspeceProtegee(
      makeRow({ espece_ministerielle: true, espece_cnpn: true }),
    );

    expect(espece.espèceMinistérielle).toBe("O");
    expect(espece.espèceCNPN).toBe("O");
  });

  it("maps the boolean flags to undefined when false", () => {
    const espece = dbRowToEspeceProtegee(makeRow());

    expect(espece.espèceMinistérielle).toBeUndefined();
    expect(espece.espèceCNPN).toBeUndefined();
  });

  it("turns empty arrays into empty Sets", () => {
    const espece = dbRowToEspeceProtegee(makeRow({ noms_vernaculaires: [], cd_type_statuts: [] }));

    expect(espece.nomsVernaculaires).toEqual(new Set());
    expect(espece.CD_TYPE_STATUTS).toEqual(new Set());
  });

  it("throws on an unknown classification", () => {
    expect(() => dbRowToEspeceProtegee(makeRow({ classification: "champignon" }))).toThrow(
      TypeError,
    );
  });
});

describe("importDescriptionMenacesEspècesFromOdsArrayBuffer", () => {
  const espèce = { CD_REF: "2437", classification: "oiseau" } as unknown as EspèceProtégée;
  const espèceByCD_REF = new Map([["2437" as EspèceProtégée["CD_REF"], espèce]]);

  const emptyParClassification = <T>(): ParClassification<Map<string, T>> => ({
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  });

  const activités = emptyParClassification<ActivitéMenançante>();
  const méthodes = emptyParClassification<MéthodeMenançante>();
  const moyensDePoursuite = emptyParClassification<MoyenDePoursuiteMenaçant>();

  const headers = ["CD_REF", "nombre individus", "identifiant pitchou activité"];
  // CD_REF is intentionally a number to exercise the .xlsx normalization path.
  const dataRow: (string | number)[] = [2437, 5, "P-2-1"];

  const buildOds = () =>
    createOdsFile(
      new Map([
        [
          "oiseau",
          [
            headers.map((value) => ({ value, type: "string" as const })),
            dataRow.map((value) =>
              typeof value === "number"
                ? { value, type: "float" as const }
                : { value, type: "string" as const },
            ),
          ],
        ],
      ]),
    );

  const buildXlsx = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, dataRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "oiseau");
    return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  };

  const parse = (fichier: ArrayBuffer) =>
    importDescriptionMenacesEspècesFromOdsArrayBuffer(
      fichier,
      espèceByCD_REF,
      activités,
      méthodes,
      moyensDePoursuite,
    );

  it("parses an impacted-espece file from an .ods array buffer", async () => {
    const description = await parse(await buildOds());

    expect(description.oiseau).toHaveLength(1);
    expect(description.oiseau[0].espèce).toBe(espèce);
    expect(description.oiseau[0].nombreIndividus).toBe(5);
  });

  it("parses an impacted-espece file from an .xlsx array buffer (numeric CD_REF)", async () => {
    const description = await parse(buildXlsx());

    expect(description.oiseau).toHaveLength(1);
    // Numeric CD_REF (2437) must still resolve against the string-keyed map.
    expect(description.oiseau[0].espèce).toBe(espèce);
    expect(description.oiseau[0].nombreIndividus).toBe(5);
  });

  it("produces the same description from an .ods and an equivalent .xlsx", async () => {
    const fromOds = await parse(await buildOds());
    const fromXlsx = await parse(buildXlsx());

    // Full equivalence is what makes every downstream consumer (impacted-espece
    // display, document generation) format-agnostic.
    expect(fromXlsx).toEqual(fromOds);
  });
});
