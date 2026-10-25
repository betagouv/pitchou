import { expect, it } from "vitest";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { compareMappings } from "./mappings.ts";

it("orders primary keys first within each table, preserving composite key order", () => {
  const row = (section: string, label: string, primaryKey: string[] = []): OnagreMapping => ({
    section,
    label,
    key: `field:${section}.${label}`,
    context: "",
    proposal: "",
    confidence: "",
    notes: "",
    status: "todo",
    target: "",
    rule: "",
    version: 1,
    updated_at: null,
    relations: { primaryKey, incoming: [], outgoing: [] },
  });
  const input = [
    row("acteurs", "acteuriddernieremodif"),
    row("jointure", "a", ["b", "a"]),
    row("acteurs", "acteursid", ["acteursid"]),
    row("jointure", "b", ["b", "a"]),
  ];
  expect(input.toSorted(compareMappings).map((row) => row.key)).toEqual([
    "field:acteurs.acteursid",
    "field:acteurs.acteuriddernieremodif",
    "field:jointure.b",
    "field:jointure.a",
  ]);
  expect(input[0].label).toBe("acteuriddernieremodif");
});
