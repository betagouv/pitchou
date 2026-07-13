import { expect, test, describe } from "vitest";

import { buildActiveFilterChips, countActiveFilters, WITHOUT_INSTRUCTEUR } from "./dossiersList.ts";
import { makeQuery } from "./dossiersTestHelpers.ts";

describe("countActiveFilters", () => {
  test("ignores the text search", () => {
    expect(countActiveFilters(makeQuery({ text: "photovoltaïque" }))).toBe(0);
  });

  test("counts dates once whatever the bounds", () => {
    expect(countActiveFilters(makeQuery({ dateStart: "2024-01-01" }))).toBe(1);
    expect(countActiveFilters(makeQuery({ dateStart: "2024-01-01", dateEnd: "2024-02-01" }))).toBe(
      1,
    );
  });

  test("sums the active attribute filters", () => {
    const query = makeQuery({
      phase: ["Instruction"],
      departement: ["64"],
      nouveaute: "oui",
      actionInstructeur: true,
    });
    expect(countActiveFilters(query)).toBe(4);
  });

  test("counts each value of a multi-valued filter, matching the tags shown", () => {
    expect(
      countActiveFilters(makeQuery({ phase: ["Instruction", "Contrôle", "Classé sans suite"] })),
    ).toBe(3);
  });

  test("matches the number of removable tags (text search aside)", () => {
    const query = makeQuery({
      text: "photovoltaïque",
      phase: ["Instruction", "Contrôle"],
      prochaineAction: ["Instructeur"],
      enjeu: true,
    });
    const tagsHorsRecherche = buildActiveFilterChips(query).filter((chip) => chip.key !== "text");
    expect(countActiveFilters(query)).toBe(tagsHorsRecherche.length);
  });
});

describe("buildActiveFilterChips", () => {
  test("returns nothing when no filter is active", () => {
    expect(buildActiveFilterChips(makeQuery())).toEqual([]);
  });

  test("labels the text search and removing its chip clears the text", () => {
    const [chip, ...rest] = buildActiveFilterChips(makeQuery({ text: "photovoltaïque" }));
    expect(rest).toHaveLength(0);
    expect(chip.label).toBe("photovoltaïque");
    expect(chip.next.text).toBe("");
  });

  test("emits one chip per selected phase and removes only that value", () => {
    const chips = buildActiveFilterChips(makeQuery({ phase: ["Instruction", "Contrôle"] }));
    expect(chips.map((c) => c.label)).toEqual(["Instruction", "Contrôle"]);
    // Removing « Instruction » keeps « Contrôle ».
    expect(chips[0].next.phase).toEqual(["Contrôle"]);
  });

  test("suffixes the prochaine action chip and uses its display label", () => {
    const [chip] = buildActiveFilterChips(
      makeQuery({ prochaineAction: ["Consultation du public"] }),
    );
    expect(chip.label).toBe("Public consulté (en charge de la prochaine action)");
    expect(chip.next.prochaineAction).toEqual([]);
  });

  test("names the « sans instructeur·ice » sentinel", () => {
    const [chip] = buildActiveFilterChips(makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR] }));
    expect(chip.label).toBe("Sans instructeur·ice");
    expect(chip.next.instructeur).toEqual([]);
  });

  test("covers the boolean filters", () => {
    const chips = buildActiveFilterChips(
      makeQuery({
        enjeu: true,
        decisionAbsente: true,
        avisExpertManquant: true,
        especesImpacteesAbsente: true,
      }),
    );
    expect(chips.map((c) => c.label)).toEqual([
      "À enjeu",
      "Décision non-renseignée",
      "Saisine ou avis d'expert manquant",
      "Espèces impactées non-renseignées",
    ]);
    const enjeuChip = chips.find((c) => c.key === "enjeu");
    expect(enjeuChip?.next.enjeu).toBe(false);
  });

  test("renders one date chip and clears the whole range on removal", () => {
    const [chip, ...rest] = buildActiveFilterChips(
      makeQuery({ dateField: "phaseStart", dateStart: "2024-01-01", dateEnd: "2024-02-01" }),
    );
    expect(rest).toHaveLength(0);
    expect(chip.label).toBe("Date de début de phase : du 01/01/2024 au 01/02/2024");
    expect(chip.next).toMatchObject({ dateField: "deposit", dateStart: "", dateEnd: "" });
  });

  test("resets the page to the first one when a chip is removed", () => {
    const [chip] = buildActiveFilterChips(makeQuery({ enjeu: true, page: 4 }));
    expect(chip.next.page).toBe(1);
  });
});
