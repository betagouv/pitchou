import { describe, expect, it } from "vitest";
import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import { especesCounts, especesCountsLabel, listeRougeCountLabel } from "./especes.ts";

function impact(
  CD_REF: string,
  especeCNPN = false,
  especeMinisterielle = false,
  statutListeRouge: FrontEndImpactOnEspece["espece"]["statutListeRouge"] = null,
) {
  return {
    espece: { CD_REF, especeCNPN, especeMinisterielle, statutListeRouge },
  } as FrontEndImpactOnEspece;
}

describe("distinct species counts", () => {
  it("counts dossier 99000010 species once despite different impacts", () => {
    const impacts = [impact("459478", true), impact("459478", true), impact("299", false, true)];
    const counts = especesCounts(impacts);
    expect(counts).toEqual({ total: 2, cnpn: 1, ministerielles: 1, listeRouge: [] });
    expect(especesCountsLabel(counts)).toBe("2 dont 1 CNPN et 1 ministérielle");
    expect(impacts).toHaveLength(3);
  });

  it("counts dual-status species once in each independent category", () => {
    expect(especesCounts([impact("1", true, true), impact("1", true, true)])).toEqual({
      total: 1,
      cnpn: 1,
      ministerielles: 1,
      listeRouge: [],
    });
  });

  it("handles an empty species list", () => {
    expect(especesCounts([])).toEqual({ total: 0, cnpn: 0, ministerielles: 0, listeRouge: [] });
  });
});

describe("red-list counts", () => {
  it("counts distinct threatened species per category, most threatened first", () => {
    const counts = especesCounts([
      impact("1", false, false, "VU"),
      impact("1", false, false, "VU"),
      impact("2", false, false, "VU"),
      impact("3", false, false, "CR"),
      impact("4"),
    ]);
    expect(counts.listeRouge).toEqual([
      { statut: "CR", count: 1 },
      { statut: "VU", count: 2 },
    ]);
    expect(counts.listeRouge.map(listeRougeCountLabel)).toEqual([
      "1 en danger critique",
      "2 vulnérables",
    ]);
    expect(listeRougeCountLabel({ statut: "EN", count: 3 })).toBe("3 en danger");
  });
});
