import { expect, test } from "vitest";
import { toRenderedGroups } from "@pitchou/ui/Select/options.ts";

test("keeps continuous keyboard indexes across loose options, groups and empty groups", () => {
  const option = (value: string) => ({ value, label: value });
  const groups = toRenderedGroups([
    option("a"),
    option("b"),
    { label: "First", options: [option("c"), option("d")] },
    { label: "Empty", options: [] },
    { label: "Second", options: [option("e")] },
    option("f"),
    option("g"),
  ]);
  expect(groups.map(({ label }) => label)).toEqual([null, "First", "Empty", "Second", null]);
  expect(
    groups.flatMap(({ options }) => options.map(({ option, index }) => [option.value, index])),
  ).toEqual([
    ["a", 0],
    ["b", 1],
    ["c", 2],
    ["d", 3],
    ["e", 4],
    ["f", 5],
    ["g", 6],
  ]);
});
