import { describe, it, expect } from "vitest";

import { dbRowToEspeceProtegee } from "./outils-espèces.ts";
import type { default as EspeceProtegee } from "../types/database/public/EspeceProtegee.ts";

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
