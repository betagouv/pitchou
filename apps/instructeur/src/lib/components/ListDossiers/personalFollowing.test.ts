import { expect, test } from "vitest";
import { filterDossiers } from "./filtering.ts";
import { defaultDossiersQuery } from "./query.ts";
import { makeDossier } from "./testHelpers.ts";

test("personal tracking retains restricted followed dossiers without broadening the service list", () => {
  const restricted = makeDossier({ access: "lecture" });
  const query = defaultDossiersQuery();
  const context = { notificationByDossier: new Map() };
  expect(filterDossiers([restricted], query, context)).toEqual([]);
  expect(filterDossiers([restricted], query, { ...context, followedOnly: true })).toEqual([
    restricted,
  ]);
  expect(restricted.access).toBe("lecture");
});

test("complete reading grants are listed in the service view", () => {
  const reader = makeDossier({ access: "lecture_complete" });
  expect(
    filterDossiers([reader], defaultDossiersQuery(), { notificationByDossier: new Map() }),
  ).toEqual([reader]);
});
