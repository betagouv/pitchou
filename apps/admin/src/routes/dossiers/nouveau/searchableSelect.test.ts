import { describe, expect, it } from "vitest";

import { filterSearchableOptions, type SearchableOption } from "./searchableSelect.ts";

const options: SearchableOption[] = [
  { value: "carriere", label: "Carrières" },
  { value: "energie", label: "Production énergie renouvelable - Éolien" },
  { value: "transport", label: "Infrastructures de transport ferroviaire" },
];

describe("filterSearchableOptions", () => {
  it("ignores accents and letter case", () => {
    expect(filterSearchableOptions(options, "CARRIERES")).toEqual([options[0]]);
    expect(filterSearchableOptions(options, "eolien")).toEqual([options[1]]);
  });

  it("matches every search term and keeps the source order", () => {
    expect(filterSearchableOptions(options, "transport infra")).toEqual([options[2]]);
    expect(filterSearchableOptions(options, "")).toEqual(options);
  });
});
