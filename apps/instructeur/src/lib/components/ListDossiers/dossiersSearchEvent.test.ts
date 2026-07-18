import { expect, test, describe } from "vitest";

import { buildSearchEvent, WITHOUT_INSTRUCTEUR, type DossiersQuery } from "./dossiersList.ts";
import { makeQuery } from "./dossiersTestHelpers.ts";

describe("buildSearchEvent", () => {
  const context = { instructeurCount: 3, email: "jane@doe.fr" };

  test("an empty query only reports nouveauté: false and the result count", () => {
    const event = buildSearchEvent(makeQuery(), 12, context);
    expect(event).toEqual({ filtres: { nouveauté: false }, nombreRésultats: 12 });
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

    expect(event.nombreRésultats).toBe(5);
    expect(event.filtres).toMatchObject({
      texte: "photovoltaïque",
      phases: ["Instruction", "Contrôle"],
      activitésPrincipales: ["Élevage"],
      départements: ["64"],
      nouveauté: true,
    });
  });

  test("prochaineAction takes priority over the actionInstructeur toggle", () => {
    const withBoth = makeQuery({ prochaineAction: ["Pétitionnaire"], actionInstructeur: true });
    expect(buildSearchEvent(withBoth, 0, context).filtres.prochaineActionAttenduePar).toEqual([
      "Pétitionnaire",
    ]);

    const toggleOnly = makeQuery({ actionInstructeur: true });
    expect(buildSearchEvent(toggleOnly, 0, context).filtres.prochaineActionAttenduePar).toEqual([
      "Instructeur",
    ]);
  });

  test("« sans instructeur·ice » sets sansInstructeurice", () => {
    const event = buildSearchEvent(makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR] }), 0, context);
    expect(event.filtres.sansInstructeurice).toBe(true);
    expect(event.filtres.suiviPar).toBeUndefined();
  });

  test("chosen instructeurs report suiviPar with their count and self-inclusion", () => {
    const self = buildSearchEvent(
      makeQuery({ instructeur: ["jane@doe.fr", "john@doe.fr"] }),
      0,
      context,
    );
    expect(self.filtres.suiviPar).toEqual({
      nombreSéléctionnées: 2,
      nombreTotal: 3,
      inclusSoiMême: true,
    });

    const other = buildSearchEvent(makeQuery({ instructeur: ["john@doe.fr"] }), 0, context);
    expect(other.filtres.suiviPar?.inclusSoiMême).toBe(false);
  });

  test("« sans instructeur·ice » and a named instructeur set both fields", () => {
    const event = buildSearchEvent(
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"] }),
      0,
      context,
    );
    expect(event.filtres.sansInstructeurice).toBe(true);
    expect(event.filtres.suiviPar?.nombreSéléctionnées).toBe(1);
  });
});
