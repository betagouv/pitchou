import { expect, test, describe } from "vitest";

import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";
import {
  parseDossiersQuery,
  readDossiersQuery,
  buildDossiersSearchParams,
  filterDossiers,
  compareDossiers,
  countActiveFilters,
  buildClearFiltersUpdates,
  clearFilters,
  buildSearchEvent,
  listAvailableActivites,
  listAvailableDepartements,
  listAvailableInstructeurs,
  WITHOUT_INSTRUCTEUR,
  type DossiersQuery,
  type DossiersContext,
} from "./dossiersList.ts";
import { départements as officialDepartements } from "@pitchou/common/départements.ts";

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

describe("readDossiersQuery", () => {
  test("applies the UI default sort (date de dépôt, décroissant) when the URL has none", () => {
    const query = readDossiersQuery(new URLSearchParams());
    expect(query.sort).toBe("depositDate");
    expect(query.order).toBe("desc");
  });

  test("keeps the sort carried by the URL", () => {
    const query = readDossiersQuery(new URLSearchParams({ sort: "name", order: "asc" }));
    expect(query.sort).toBe("name");
    expect(query.order).toBe("asc");
  });
});

describe("buildDossiersSearchParams", () => {
  test("omits defaults, keeping the URL empty for a pristine query", () => {
    expect(buildDossiersSearchParams(readDossiersQuery(new URLSearchParams())).toString()).toBe("");
  });

  test("round-trips every filter through the URL", () => {
    const query = makeQuery({
      text: "photovoltaïque",
      phase: ["Instruction", "Contrôle"],
      activite: ["Élevage"] as unknown as DossiersQuery["activite"],
      prochaineAction: ["Pétitionnaire"],
      departement: ["64", "33"],
      instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"],
      nouveaute: "oui",
      enjeu: true,
      decisionText: "AP-2024-042",
      decisionAbsente: true,
      avisExpertManquant: true,
      dateField: "phaseStart",
      dateStart: "2024-01-01",
      dateEnd: "2024-02-01",
      sort: "name",
      order: "asc",
      page: 3,
    });
    const params = buildDossiersSearchParams(query);
    expect(readDossiersQuery(params)).toEqual(query);
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

  test("« à enjeu » keeps only dossiers flagged as such", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), enjeu: true }),
      makeDossier({ id: dossierId(2), enjeu: false }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ enjeu: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« décision non-renseignée » keeps dossiers without any décision administrative", () => {
    const décision = [
      { numéro: "AP-2024-042" },
    ] as unknown as DossierRésumé["décisionsAdministratives"];
    const dossiers = [
      makeDossier({ id: dossierId(1), décisionsAdministratives: [] }),
      makeDossier({ id: dossierId(2), décisionsAdministratives: décision }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ decisionAbsente: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« décision administrative » matches the numéro, case- and accent-insensitively", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        décisionsAdministratives: [
          { numéro: "AP-2024-042" },
        ] as unknown as DossierRésumé["décisionsAdministratives"],
      }),
      makeDossier({
        id: dossierId(2),
        décisionsAdministratives: [
          { numéro: "AP-2023-999" },
        ] as unknown as DossierRésumé["décisionsAdministratives"],
      }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ decisionText: "2024-042" }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« saisine ou avis manquant » keeps dossiers with an incomplete avis expert", () => {
    const dossiers = [
      makeDossier({
        id: dossierId(1),
        avisExperts: [{ saisineFichierPresent: true, avisFichierPresent: false }],
      }),
      makeDossier({
        id: dossierId(2),
        avisExperts: [{ saisineFichierPresent: true, avisFichierPresent: true }],
      }),
      makeDossier({ id: dossierId(3), avisExperts: [] }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ avisExpertManquant: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("routes the text search through the filter (digit query matches a département code)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), départements: ["64"] }),
      makeDossier({ id: dossierId(2), départements: ["33"] }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ text: "64" }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("keeps only the chosen activité, dropping dossiers with none", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), activité_principale: "Carrières" }),
      makeDossier({ id: dossierId(2), activité_principale: "Conservation des espèces" }),
      makeDossier({ id: dossierId(3), activité_principale: null }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ activite: ["Carrières"] }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("« actionInstructeur » keeps dossiers awaiting the instructeur", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), prochaine_action_attendue_par: "Instructeur" }),
      makeDossier({ id: dossierId(2), prochaine_action_attendue_par: "Pétitionnaire" }),
    ];
    const result = filterDossiers(dossiers, makeQuery({ actionInstructeur: true }), makeContext());
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("keeps dossiers matching any selected prochaine action (OR)", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), prochaine_action_attendue_par: "Instructeur" }),
      makeDossier({ id: dossierId(2), prochaine_action_attendue_par: "Pétitionnaire" }),
      makeDossier({ id: dossierId(3), prochaine_action_attendue_par: null }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ prochaineAction: ["Instructeur", "Pétitionnaire"] }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1, 2]);
  });

  test("« nouveaute non » keeps dossiers without an unseen notification", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-02") }],
    ]);
    const result = filterDossiers(
      dossiers,
      makeQuery({ nouveaute: "non" }),
      makeContext({ notificationParDossier }),
    );
    // 2 is seen, 3 has no notification at all → both kept; 1 is unseen → dropped
    expect(result.map((d) => d.id)).toEqual([2, 3]);
  });

  test("combines active filters with AND", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), phase: "Instruction", enjeu: true }),
      makeDossier({ id: dossierId(2), phase: "Instruction", enjeu: false }),
      makeDossier({ id: dossierId(3), phase: "Contrôle", enjeu: true }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ phase: ["Instruction"], enjeu: true }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });
});

describe("filterDossiers — date range", () => {
  // Dates are built with an explicit local time so the assertions stay independent
  // of the runner's timezone (the filter also builds its bounds in local time).
  test("keeps dossiers whose deposit date falls inside the inclusive range", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_dépôt: new Date("2024-01-15T12:00:00") }),
      makeDossier({ id: dossierId(2), date_dépôt: new Date("2024-02-01T09:00:00") }),
      makeDossier({ id: dossierId(3), date_dépôt: new Date("2024-02-28T15:00:00") }),
      makeDossier({ id: dossierId(4), date_dépôt: new Date("2024-03-10T12:00:00") }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "deposit", dateStart: "2024-02-01", dateEnd: "2024-02-28" }),
      makeContext(),
    );
    // Both bounds are inclusive: the 1st (start of day) and the 28th (end of day) are kept.
    expect(result.map((d) => d.id)).toEqual([2, 3]);
  });

  test("filters on the phase start date when that field is chosen", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_début_phase: new Date("2024-06-15T12:00:00") }),
      makeDossier({ id: dossierId(2), date_début_phase: new Date("2024-09-15T12:00:00") }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "phaseStart", dateStart: "2024-06-01", dateEnd: "2024-06-30" }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("filters on the last modification date when that field is chosen", () => {
    const dossiers = [makeDossier({ id: dossierId(1) }), makeDossier({ id: dossierId(2) })];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: true, date_dernière_mise_à_jour: new Date("2024-06-15T12:00:00") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-09-15T12:00:00") }],
    ]);
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "lastModified", dateStart: "2024-06-01", dateEnd: "2024-06-30" }),
      makeContext({ notificationParDossier }),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });

  test("excludes dossiers that lack the chosen date", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_début_phase: new Date("2024-06-15T12:00:00") }),
      makeDossier({ id: dossierId(2), date_début_phase: undefined }),
    ];
    const result = filterDossiers(
      dossiers,
      makeQuery({ dateField: "phaseStart", dateStart: "2024-01-01" }),
      makeContext(),
    );
    expect(result.map((d) => d.id)).toEqual([1]);
  });
});

describe("compareDossiers", () => {
  const noNotifications = new Map<DossierRésumé["id"], Notification>();

  function sortIds(
    dossiers: DossierRésumé[],
    ...[sort, order, notifs]: [
      Parameters<typeof compareDossiers>[2],
      Parameters<typeof compareDossiers>[3],
      Parameters<typeof compareDossiers>[4]?,
    ]
  ): number[] {
    return [...dossiers]
      .sort((a, b) => compareDossiers(a, b, sort, order, notifs ?? noNotifications))
      .map((d) => d.id as number);
  }

  test("sorts by name with French collation and honours the order", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), nom: "Zèbre" }),
      makeDossier({ id: dossierId(2), nom: "Abricot" }),
      makeDossier({ id: dossierId(3), nom: "Éléphant" }),
    ];
    expect(sortIds(dossiers, "name", "asc")).toEqual([2, 3, 1]);
    expect(sortIds(dossiers, "name", "desc")).toEqual([1, 3, 2]);
  });

  test("sorts by deposit date, newest first when descending", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_dépôt: new Date("2024-01-01") }),
      makeDossier({ id: dossierId(2), date_dépôt: new Date("2024-03-01") }),
      makeDossier({ id: dossierId(3), date_dépôt: new Date("2024-02-01") }),
    ];
    expect(sortIds(dossiers, "depositDate", "desc")).toEqual([2, 3, 1]);
    expect(sortIds(dossiers, "depositDate", "asc")).toEqual([1, 3, 2]);
  });

  test("sorts by last modification date, placing unknown dates last in both directions", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1) }),
      makeDossier({ id: dossierId(2) }),
      makeDossier({ id: dossierId(3) }),
    ];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-10") }],
      // 3 has no notification → unknown date
    ]);
    expect(sortIds(dossiers, "lastModified", "desc", notificationParDossier)).toEqual([2, 1, 3]);
    expect(sortIds(dossiers, "lastModified", "asc", notificationParDossier)).toEqual([1, 2, 3]);
  });

  test("« nouveaute » puts unseen notifications first, most recent first", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), date_dépôt: new Date("2024-01-01") }),
      makeDossier({ id: dossierId(2), date_dépôt: new Date("2024-01-02") }),
      makeDossier({ id: dossierId(3), date_dépôt: new Date("2024-01-03") }),
    ];
    const notificationParDossier = new Map<DossierRésumé["id"], Notification>([
      [dossierId(1), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-01") }],
      [dossierId(2), { vue: false, date_dernière_mise_à_jour: new Date("2024-05-03") }],
      [dossierId(3), { vue: true, date_dernière_mise_à_jour: new Date("2024-05-02") }],
    ]);
    // Unseen (2 then 1, by update date) come before the seen dossier 3.
    expect(sortIds(dossiers, "nouveaute", "desc", notificationParDossier)).toEqual([2, 1, 3]);
  });
});

describe("list available options", () => {
  test("listAvailableActivites dedupes, drops null and sorts alphabetically", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), activité_principale: "Conservation des espèces" }),
      makeDossier({ id: dossierId(2), activité_principale: "Carrières" }),
      makeDossier({ id: dossierId(3), activité_principale: "Conservation des espèces" }),
      makeDossier({ id: dossierId(4), activité_principale: null }),
    ];
    expect(listAvailableActivites(dossiers)).toEqual(["Carrières", "Conservation des espèces"]);
  });

  test("listAvailableDepartements keeps the official list and appends unknown codes", () => {
    const dossiers = [
      makeDossier({ id: dossierId(1), départements: ["64"] }),
      makeDossier({ id: dossierId(2), départements: ["999"] }),
    ];
    const result = listAvailableDepartements(dossiers);

    expect(result).toHaveLength(officialDepartements.length + 1);
    expect(result.find((d) => d.code === "64")?.nom).toBe("Pyrénées-Atlantiques");
    // An unknown code is surfaced with the code itself as label so it stays filterable.
    expect(result.some((d) => d.code === "999" && d.nom === "999")).toBe(true);
  });

  test("listAvailableInstructeurs keeps only those following a dossier, sorted", () => {
    const relationSuivis = new Map<string, Set<DossierRésumé["id"]>>([
      ["zoe@doe.fr", new Set([dossierId(1)])],
      ["amir@doe.fr", new Set([dossierId(2)])],
      ["personne@doe.fr", new Set()],
    ]);
    expect(listAvailableInstructeurs(relationSuivis)).toEqual(["amir@doe.fr", "zoe@doe.fr"]);
  });
});

describe("clearFilters", () => {
  test("resets every filter and the page but keeps the text search and the sort", () => {
    const query = makeQuery({
      text: "photovoltaïque",
      phase: ["Instruction"],
      enjeu: true,
      avisExpertManquant: true,
      sort: "name",
      order: "asc",
      page: 3,
    });
    const cleared = clearFilters(query);

    expect(countActiveFilters(cleared)).toBe(0);
    expect(cleared.text).toBe("photovoltaïque");
    expect(cleared.sort).toBe("name");
    expect(cleared.order).toBe("asc");
    expect(cleared.page).toBe(1);
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
