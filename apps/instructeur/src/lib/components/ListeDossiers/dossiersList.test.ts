import { expect, test, describe } from "vitest";

import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";
import {
  parseDossiersQuery,
  filterDossiers,
  countActiveFilters,
  buildClearFiltersUpdates,
  buildSearchEvent,
  WITHOUT_INSTRUCTEUR,
  type DossiersQuery,
  type DossiersContext,
} from "./dossiersList.ts";

/** Brands a raw number as a DossierId for the test fixtures */
const dossierId = (n: number) => n as DossierRésumé["id"];

/** A valid query with all defaults, overridable field by field */
function makeQuery(overrides: Partial<DossiersQuery> = {}): DossiersQuery {
  return { ...parseDossiersQuery(new URLSearchParams()), ...overrides };
}

function makeDossier(overrides: Partial<DossierRésumé> = {}): DossierRésumé {
  return {
    id: dossierId(1),
    nom: "Dossier test",
    phase: "Instruction",
    date_dépôt: new Date("2024-01-01"),
    ...overrides,
  } as DossierRésumé;
}

type Notification =
  PitchouState["notificationParDossier"] extends Map<infer _K, infer V> ? V : never;

function makeContext(overrides: Partial<DossiersContext> = {}): DossiersContext {
  return {
    notificationParDossier: new Map<DossierRésumé["id"], Notification>(),
    ...overrides,
  };
}

describe("parseDossiersQuery", () => {
  test("falls back to sensible defaults on an empty URL", () => {
    const query = parseDossiersQuery(new URLSearchParams());

    expect(query).toMatchObject({
      text: "",
      phase: [],
      activite: [],
      prochaineAction: [],
      departement: [],
      instructeur: [],
      nouveaute: "",
      actionInstructeur: false,
      dateField: "deposit",
      sort: "nouveaute",
      order: "desc",
      page: 1,
    });
  });

  test("reads each param", () => {
    const params = new URLSearchParams({
      q: "photovoltaïque",
      activite: "Élevage",
      action: "Instructeur",
      instructeur: "jane@doe.fr",
      nouveaute: "oui",
      actionInstructeur: "1",
      dateField: "phaseStart",
      from: "2024-01-01",
      to: "2024-02-01",
      sort: "name",
      order: "asc",
      page: "3",
    });
    // Multi-valued filters appear once per selected value
    params.append("phase", "Instruction");
    params.append("phase", "Contrôle");
    params.append("departement", "64");
    params.append("departement", "33");

    expect(parseDossiersQuery(params)).toMatchObject({
      text: "photovoltaïque",
      phase: ["Instruction", "Contrôle"],
      activite: ["Élevage"],
      prochaineAction: ["Instructeur"],
      departement: ["64", "33"],
      instructeur: ["jane@doe.fr"],
      nouveaute: "oui",
      actionInstructeur: true,
      dateField: "phaseStart",
      dateStart: "2024-01-01",
      dateEnd: "2024-02-01",
      sort: "name",
      order: "asc",
      page: 3,
    });
  });

  test("rejects invalid enum-like values", () => {
    const params = new URLSearchParams({
      nouveaute: "peut-être",
      dateField: "n-importe-quoi",
      sort: "n-importe-quoi",
      order: "n-importe-quoi",
      page: "-2",
    });
    const query = parseDossiersQuery(params);

    expect(query.nouveaute).toBe("");
    expect(query.dateField).toBe("deposit");
    expect(query.sort).toBe("nouveaute");
    expect(query.order).toBe("desc");
    expect(query.page).toBe(1);
  });
});

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

  test("counts a multi-valued filter once whatever the number of values", () => {
    expect(
      countActiveFilters(makeQuery({ phase: ["Instruction", "Contrôle", "Classé sans suite"] })),
    ).toBe(1);
  });
});

describe("buildClearFiltersUpdates", () => {
  test("clears every filter but keeps the text search and the sort", () => {
    const params = new URLSearchParams({
      q: "photovoltaïque",
      phase: "Instruction",
      departement: "64",
      nouveaute: "oui",
      actionInstructeur: "1",
      from: "2024-01-01",
      sort: "name",
    });
    // Apply the updates: every param set to null is removed from the URL.
    for (const [key, value] of Object.entries(buildClearFiltersUpdates())) {
      if (value === null) params.delete(key);
    }
    const next = parseDossiersQuery(params);

    expect(countActiveFilters(next)).toBe(0);
    expect(next.text).toBe("photovoltaïque");
    expect(next.sort).toBe("name");
  });
});

describe("filterDossiers", () => {
  test("keeps only the chosen phase", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), phase: "Instruction" }),
      makeDossier({ id: dossierId(2), phase: "Contrôle" }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ phase: ["Contrôle"] }), makeContext());
    expect(result.map((d) => d.id)).toEqual([2]);
  });

  test("keeps dossiers matching any of several selected phases", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), phase: "Instruction" }),
      makeDossier({ id: dossierId(2), phase: "Contrôle" }),
      makeDossier({ id: dossierId(3), phase: "Accompagnement amont" }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ phase: ["Instruction", "Contrôle"] }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });

  test("keeps a dossier when any of its départements is selected", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), départements: ["44", "49"] }),
      makeDossier({ id: dossierId(2), départements: ["33"] }),
      makeDossier({ id: dossierId(3), départements: ["75"] }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ departement: ["33", "49"] }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });

  test("« nouveaute oui » keeps only dossiers with an unseen notification", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-02") }],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "oui" }),
      makeContext({ notificationParDossier }),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« sans instructeur·ice » keeps only dossiers nobody follows", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const relationSuivis = new Map<string, Set<DossierRésumé["id"]>>([
      ["jane@doe.fr", new Set([dossierId(1)])],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR] }),
      makeContext({ relationSuivis }),
    );
    expect(result.map((d) => d.id)).toEqual([2]);
  });

  test("« sans instructeur·ice » combined with a named one keeps both (OR)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const relationSuivis = new Map<string, Set<DossierRésumé["id"]>>([
      ["jane@doe.fr", new Set([dossierId(1)])],
      ["john@doe.fr", new Set([dossierId(3)])],
    ]);

    const result = filterDossiers(
      dossiers,
      makeQuery({ instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"] }),
      makeContext({ relationSuivis }),
    );
    // 1 is followed by jane, 2 is unfollowed; 3 is followed only by john → excluded
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });
});

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
