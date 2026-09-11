import { describe, expect, it } from "vitest";
import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import { especesCounts, especesCountsLabel } from "./especes.ts";

function impact(CD_REF: string, especeCNPN = false, especeMinisterielle = false) {
  return { espece: { CD_REF, especeCNPN, especeMinisterielle } } as FrontEndImpactOnEspece;
}

describe("distinct species counts", () => {
  it("counts dossier 99000010 species once despite different impacts", () => {
    const impacts = [impact("459478", true), impact("459478", true), impact("299", false, true)];
    const counts = especesCounts(impacts);
    expect(counts).toEqual({ total: 2, cnpn: 1, ministerielles: 1 });
    expect(especesCountsLabel(counts)).toBe("2 dont 1 CNPN et 1 ministérielle");
    expect(impacts).toHaveLength(3);
  });

  it("counts dual-status species once in each independent category", () => {
    expect(especesCounts([impact("1", true, true), impact("1", true, true)])).toEqual({
      total: 1,
      cnpn: 1,
      ministerielles: 1,
    });
  });

  it("handles an empty species list", () => {
    expect(especesCounts([])).toEqual({ total: 0, cnpn: 0, ministerielles: 0 });
  });
});
