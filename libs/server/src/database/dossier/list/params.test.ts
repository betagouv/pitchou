import { describe, expect, it } from "vitest";
import { readParams } from "./params.ts";

describe("server list URL parameters", () => {
  it("keeps defaults and only applies ascending order with an explicit sort", () => {
    expect(readParams(new URLSearchParams("order=asc"))).toMatchObject({
      sort: "depositDate",
      order: "desc",
      page: 1,
      pageSize: 10,
      timeZone: "UTC",
    });
    expect(readParams(new URLSearchParams("sort=lastModified&order=asc"))).toMatchObject({
      sort: "lastModified",
      order: "asc",
    });
  });

  it("normalizes accents and punctuation and deduplicates terms without truncating", () => {
    const terms = Array.from({ length: 70 }, (_, i) => `mot${i}`);
    const params = new URLSearchParams({ q: `ÉTÉ, été! ${terms.join(" ")}` });
    expect(readParams(params).terms).toEqual(["ete", ...terms]);
  });

  it.each([
    ["", "all", []],
    ["departements=all&departement=24", "all", ["24"]],
    ["departements=custom", "none", []],
    ["departements=none&departement=24", "none", ["24"]],
    ["departement=24&departement=24&departement=33", "custom", ["24", "33"]],
  ])(
    "preserves department selection sentinels for %s",
    (search, departmentSelection, departments) => {
      expect(readParams(new URLSearchParams(search))).toMatchObject({
        departmentSelection,
        departments,
      });
    },
  );

  it("rejects unsupported pagination and timezone values", () => {
    expect(
      readParams(new URLSearchParams("page=Infinity&pageSize=1000&timeZone=invalid")),
    ).toMatchObject({
      page: 1,
      pageSize: 10,
      timeZone: "UTC",
    });
    expect(
      readParams(new URLSearchParams("page=7&pageSize=100&timeZone=Europe%2FParis")),
    ).toMatchObject({
      page: 7,
      pageSize: 100,
      timeZone: "Europe/Paris",
    });
  });
});
