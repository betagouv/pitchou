import { expect, test, describe } from "vitest";

import { buildSearchEvent, WITHOUT_INSTRUCTEUR, type DossiersQuery } from "./dossiersList.ts";
import { makeQuery } from "./dossiersTestHelpers.ts";

describe("buildSearchEvent", () => {
  const context = { instructeurCount: 3, email: "jane@doe.fr" };

  test("an empty query only reports nouveaute: false and the result count", () => {
    const event = buildSearchEvent(makeQuery(), 12, context);
    expect(event).toEqual({ filters: { nouveaute: false }, resultCount: 12 });
  });

  test("maps each active filter to the analytics payload", () => {
    const query = makeQuery({
      text: "photovoltaïque",
      phase: ["Instruction", "Contrôle"],
      activite: ["Élevage"] as unknown as DossiersQuery["activite"],
      departement: ["64"],
      nouveaute: "oui",
    });
    const event = buildSearchEvent(query, 5, context);

    expect(event.resultCount).toBe(5);
    expect(event.filters).toMatchObject({
      text: "photovoltaïque",
      phases: ["Instruction", "Contrôle"],
      activitesPrincipales: ["Élevage"],
      departements: ["64"],
      nouveaute: true,
    });
  });

  test("prochaineAction takes priority over the actionInstructeur toggle", () => {
    const withBoth = makeQuery({ prochaineAction: ["Pétitionnaire"], actionInstructeur: true });
    expect(buildSearchEvent(withBoth, 0, context).filters.nextActionExpectedFrom).toEqual([
      "Pétitionnaire",
    ]);

    const toggleOnly = makeQuery({ actionInstructeur: true });
    expect(buildSearchEvent(toggleOnly, 0, context).filters.nextActionExpectedFrom).toEqual([
      "Instructeur",
    ]);
  });

  test("« sans instructeur·ice » sets withoutInstructeur", () => {
    const event = buildSearchEvent(makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR] }), 0, context);
    expect(event.filters.withoutInstructeur).toBe(true);
    expect(event.filters.followedBy).toBeUndefined();
  });

  test("chosen instructeurs report followedBy with their count and self-inclusion", () => {
    const self = buildSearchEvent(
      makeQuery({ instructeur: ["jane@doe.fr", "john@doe.fr"] }),
      0,
      context,
    );
    expect(self.filters.followedBy).toEqual({
      selectedCount: 2,
      totalCount: 3,
      includesSelf: true,
    });

    const other = buildSearchEvent(makeQuery({ instructeur: ["john@doe.fr"] }), 0, context);
    expect(other.filters.followedBy?.includesSelf).toBe(false);
  });

  test("« sans instructeur·ice » and a named instructeur set both fields", () => {
    const event = buildSearchEvent(
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"] }),
      0,
      context,
    );
    expect(event.filters.withoutInstructeur).toBe(true);
    expect(event.filters.followedBy?.selectedCount).toBe(1);
  });
});
