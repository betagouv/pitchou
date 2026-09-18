import { expect, test } from "vitest";
import { clearFilters, countActiveFilters, toggleQuickFilter } from "./listModel.ts";
import { makeQuery } from "./testHelpers.ts";

test("clearing or toggling filters preserves the selected page size", () => {
  const query = makeQuery({ pageSize: 50, page: 3, enjeu: true });
  expect(clearFilters(query)).toMatchObject({ pageSize: 50, page: 1, enjeu: false });
  expect(toggleQuickFilter(query, "nouveaute")).toMatchObject({
    pageSize: 50,
    page: 1,
    nouveaute: "oui",
  });
  expect(countActiveFilters(makeQuery({ pageSize: 50 }))).toBe(0);
});
