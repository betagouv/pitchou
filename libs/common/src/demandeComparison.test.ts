import { expect, test } from "vitest";
import type {
  ComparisonRecord,
  DemandeComparisonDocument,
} from "@pitchou/types/demandeComparison.ts";
import { compareDemandes } from "./demandeComparison.ts";
import { comparisonValue, unorderedValues } from "./demandeComparison/values.ts";
import { parseCalendarDate, withCalendarDateJSON } from "./calendarDate.ts";

function record(value: string, identity?: string): ComparisonRecord {
  return {
    key: "CNPN",
    label: "CNPN",
    identity,
    fields: [{ key: "avis", label: "Avis", value }],
  };
}

function document(...records: ComparisonRecord[]): DemandeComparisonDocument {
  return { sections: [{ key: "avis", label: "Avis des experts", records }] };
}

test("compares independent demandes without treating their database identities as changes", () => {
  expect(
    compareDemandes(document(record("Favorable", "1:a")), document(record("Favorable", "2:b"))),
  ).toEqual([]);
});

test("matches reordered repeated records by content before comparing the changed record", () => {
  const left = document(record("Favorable"), record("Défavorable"));
  const right = document(record("Favorable sous conditions"), record("Favorable"));
  expect(compareDemandes(left, right)).toEqual([
    {
      path: ["Avis des experts", "CNPN", "Avis"],
      kind: "changed",
      left: "Défavorable",
      right: "Favorable sous conditions",
    },
  ]);
});

test("uses a stable identity when the semantic key changed within the same demande", () => {
  const before = record("Favorable", "1:a");
  const after = { ...record("Défavorable", "1:a"), key: "CSRPN", label: "CSRPN" };
  expect(compareDemandes(document(before), document(after))).toHaveLength(1);
});

test("preserves duplicates and reports their removal", () => {
  const differences = compareDemandes(
    document(record("Favorable"), record("Favorable")),
    document(record("Favorable")),
  );
  expect(differences).toEqual([
    {
      path: ["Avis des experts", "CNPN"],
      kind: "removed",
      left: { Avis: "Favorable" },
      right: null,
    },
  ]);
});

test("preserves repeated occurrences of the same object", () => {
  const item = record("Favorable");
  expect(compareDemandes(document(item, item), document(item))).toHaveLength(1);
});

test("does not invent matches between several ambiguous records", () => {
  const differences = compareDemandes(
    document(record("A"), record("B")),
    document(record("C"), record("D")),
  );
  expect(differences.map(({ kind }) => kind)).toEqual(["removed", "removed", "added", "added"]);
});

test("finds a change in a controle nested within a prescription", () => {
  const left = document({
    ...record("Favorable"),
    sections: [
      {
        key: "prescriptions",
        label: "Prescriptions",
        records: [
          {
            key: "article-1",
            label: "Article 1",
            fields: [],
            sections: [
              {
                key: "controles",
                label: "Contrôles",
                records: [
                  {
                    key: "2026-11-03",
                    label: "03/11/2026",
                    fields: [{ key: "result", label: "Résultat", value: "Conforme" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  const right = structuredClone(left);
  right.sections[0].records[0].sections![0].records[0].sections![0].records[0].fields[0].value =
    "Non conforme";
  expect(compareDemandes(left, right)).toEqual([
    {
      path: [
        "Avis des experts",
        "CNPN",
        "Prescriptions",
        "Article 1",
        "Contrôles",
        "03/11/2026",
        "Résultat",
      ],
      kind: "changed",
      left: "Conforme",
      right: "Non conforme",
    },
  ]);
});

test("keeps false, zero and an empty string distinct from a missing value", () => {
  const before = record("Favorable");
  before.fields = ["bool", "count", "text"].map((key) => ({ key, label: key, value: null }));
  const after = {
    ...before,
    fields: before.fields.map((field, index) => ({
      ...field,
      value: [false, 0, ""][index],
    })),
  };
  expect(compareDemandes(document(before), document(after)).map(({ right }) => right)).toEqual([
    false,
    0,
    "",
  ]);
});

test("normalizes explicitly unordered selections but preserves geometry coordinate order", () => {
  expect(unorderedValues(["71", "21"])).toEqual(unorderedValues(["21", "71"]));
  const before = record("Favorable");
  before.fields = [{ key: "map", label: "Carte", value: { coordinates: [1, 2] } }];
  const after = {
    ...before,
    fields: [{ key: "map", label: "Carte", value: { coordinates: [2, 1] } }],
  };
  expect(compareDemandes(document(before), document(after))).toHaveLength(1);
});

test("compares JSON objects independently of their property order", () => {
  const before = record("Favorable");
  before.fields = [
    { key: "location", label: "Localisation", value: { code: "71", name: "Saône-et-Loire" } },
  ];
  const after = {
    ...before,
    fields: [
      { key: "location", label: "Localisation", value: { name: "Saône-et-Loire", code: "71" } },
    ],
  };
  expect(compareDemandes(document(before), document(after))).toEqual([]);
});

test("normalizes live and JSON dates identically without shifting SQL calendar days", () => {
  const value = {
    date: withCalendarDateJSON(parseCalendarDate("2026-07-15")),
    timestamp: new Date("2026-11-03T12:00:00Z"),
  };
  expect(comparisonValue(value)).toEqual(comparisonValue(JSON.parse(JSON.stringify(value))));
  expect(comparisonValue(value)).toMatchObject({ date: "2026-07-15" });
});
