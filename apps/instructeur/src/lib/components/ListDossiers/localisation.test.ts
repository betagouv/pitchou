import { describe, expect, test, vi } from "vitest";
import {
  assignedDepartments,
  listAssignedDepartements,
  listAvailableDepartements,
  filterDossiers,
  defaultDossiersQuery,
  readDossiersQuery,
  buildDossiersSearchParams,
  changeLocalisation,
  clearFilters,
  buildClearFiltersUpdates,
  buildActiveFilterChips,
  countActiveFilters,
  buildSearchEvent,
  WITHOUT_INSTRUCTEUR,
} from "./listModel.ts";
import { navigateDossiers } from "./navigation.ts";
import { filterByLocalisation } from "./localisation.ts";
import { dossierId, makeDossier, makeContext } from "./testHelpers.ts";

const summaries = [
  makeDossier({ id: dossierId(1), access: "complet", departments: ["44", "49"], name: "Owned" }),
  makeDossier({
    id: dossierId(2),
    access: "complet",
    departments: ["33", "44"],
    name: "Other owned",
  }),
  makeDossier({ id: dossierId(3), access: "lecture", departments: ["49"], name: "Foreign nearby" }),
  makeDossier({
    id: dossierId(4),
    access: "lecture",
    departments: ["75"],
    name: "Foreign elsewhere",
  }),
  makeDossier({ id: dossierId(5), access: "lecture", departments: null }),
  makeDossier({ id: dossierId(6), access: "complet", departments: [] }),
  makeDossier({ id: dossierId(7), access: "complet", departments: null }),
];
const ctx = makeContext();
const assigned = defaultDossiersQuery();
const france = changeLocalisation(assigned, "france");

describe("localisation filtering", () => {
  test("unions every full-access territory, including unfollowed summaries", () => {
    const departments = assignedDepartments(summaries);
    expect([...departments]).toEqual(["44", "49", "33"]);
    expect(listAssignedDepartements(departments).map(({ code }) => code)).toEqual([
      "33",
      "44",
      "49",
    ]);
  });

  test("assigned scope includes only owned dossiers, even without departments", () => {
    expect(filterByLocalisation(summaries, assigned).map(({ id }) => id)).toEqual([1, 2, 6, 7]);
    expect(filterDossiers(summaries, assigned, ctx).map(({ id }) => id)).toEqual([1, 2, 6, 7]);
  });

  test("search and followed-only bases do not widen the assigned scope", () => {
    expect(
      filterDossiers(summaries, { ...assigned, text: "Foreign" }, ctx).map(({ id }) => id),
    ).toEqual([]);
    const followed = [summaries[0], summaries[2], summaries[3]];
    expect(filterDossiers(followed, assigned, ctx)).toEqual([summaries[0]]);
    expect(filterDossiers(followed, france, ctx)).toEqual(followed);
  });

  test("national all includes every dossier regardless of ownership or department", () => {
    expect(filterDossiers(summaries, france, ctx)).toEqual(summaries);
  });

  test.each([assigned, france])("none differs from all in $localisation", (query) => {
    expect(filterDossiers(summaries, { ...query, departementSelection: "none" }, ctx)).toEqual([]);
    expect(
      filterDossiers(
        summaries,
        { ...query, departementSelection: "custom", departement: ["49"] },
        ctx,
      ).map(({ id }) => id),
    ).toEqual(query.localisation === "assigned" ? [1] : [1, 3]);
  });

  test("custom departments cannot escape the assigned scope", () => {
    expect(
      filterDossiers(
        [...summaries, makeDossier({ access: "lecture", departments: ["44", "75"] })],
        { ...assigned, departementSelection: "custom", departement: ["75"] },
        ctx,
      ),
    ).toEqual([]);
  });

  test("missing foreign follow data is never treated as unassigned", () => {
    const query = { ...france, instructeur: [WITHOUT_INSTRUCTEUR] };
    expect(filterDossiers(summaries, query, ctx).map(({ id }) => id)).toEqual([1, 2, 6, 7]);
  });

  test("national options retain official departments and unknown codes", () => {
    const options = listAvailableDepartements([
      makeDossier({ access: "lecture", departments: ["unknown"] }),
    ]);
    expect(options).toContainEqual({ code: "75", name: "Paris" });
    expect(options).toContainEqual({ code: "unknown", name: "unknown" });
  });
});

describe("localisation URL and reset", () => {
  test("duplicate department params cannot create duplicate keyed chips", () => {
    const query = readDossiersQuery(new URLSearchParams("departement=44&departement=44"));
    expect(query.departement).toEqual(["44"]);
    expect(buildActiveFilterChips(query)).toHaveLength(1);
  });

  test.each(["assigned", "france"] as const)(
    "round-trips all department states in %s",
    (localisation) => {
      for (const departementSelection of ["all", "none", "custom"] as const) {
        const query = {
          ...assigned,
          localisation,
          departementSelection,
          departement: departementSelection === "custom" ? ["33", "49"] : [],
        };
        expect(readDossiersQuery(buildDossiersSearchParams(query))).toEqual(query);
      }
      expect(buildDossiersSearchParams(assigned).toString()).toBe("");
    },
  );

  test("preserves historical department URLs as custom selections", () => {
    expect(readDossiersQuery(new URLSearchParams("departement=33&departement=49"))).toMatchObject({
      localisation: "assigned",
      departementSelection: "custom",
      departement: ["33", "49"],
    });
    expect(
      readDossiersQuery(new URLSearchParams("localisation=invalid&departements=invalid")),
    ).toEqual(assigned);
    expect(readDossiersQuery(new URLSearchParams("departements=custom"))).toMatchObject({
      departementSelection: "none",
    });
  });

  test("scope changes reset departments and pagination but retain unrelated filters", () => {
    const query = {
      ...assigned,
      text: "marais",
      departementSelection: "custom" as const,
      departement: ["44"],
      page: 3,
    };
    const next = changeLocalisation(query, "france");
    expect(next).toEqual({ ...france, text: "marais" });
    expect(query.departement).toEqual(["44"]);
    expect(clearFilters({ ...next, departementSelection: "none" })).toEqual({
      ...assigned,
      text: "marais",
    });
    const params = buildDossiersSearchParams(next);
    for (const key of Object.keys(buildClearFiltersUpdates())) params.delete(key);
    expect(readDossiersQuery(params)).toEqual({ ...assigned, text: "marais" });
  });

  test("navigation persists national none and returns to the path on reset", () => {
    const goto = vi.fn();
    navigateDossiers(goto, "/tous-les-dossiers", { ...france, departementSelection: "none" });
    expect(goto.mock.lastCall?.[0]).toBe("?localisation=france&departements=none");
    navigateDossiers(goto, "/tous-les-dossiers", assigned);
    expect(goto.mock.lastCall?.[0]).toBe("/tous-les-dossiers");
  });
});

test("chips and analytics distinguish France, none and custom", () => {
  const query = { ...france, departementSelection: "none" as const };
  const chips = buildActiveFilterChips(query);
  expect(chips.map(({ label }) => label)).toEqual([
    "France entière (lecture seule)",
    "Aucun département",
  ]);
  expect(countActiveFilters(query)).toBe(chips.length);
  expect(chips[0].next).toEqual(assigned);
  expect(chips[1].next).toEqual(france);
  const custom = { ...france, departementSelection: "custom" as const, departement: ["49"] };
  expect(buildActiveFilterChips(custom)[1].next).toEqual(france);
  const context = { email: "instructeur@example.org", instructeurCount: 0 };
  expect(buildSearchEvent(query, 0, context).filters).toMatchObject({
    localisation: "france",
    departementSelection: "none",
  });
  expect(buildSearchEvent(custom, 2, context).filters).toMatchObject({
    localisation: "france",
    departementSelection: "custom",
    departements: ["49"],
  });
});
