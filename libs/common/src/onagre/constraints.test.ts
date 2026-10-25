import { expect, it } from "vitest";
import { withConstraints, fieldRelations } from "./constraints.ts";
import type { OnagreTable } from "@pitchou/types/onagre.ts";

const tables: OnagreTable[] = [
  { name: "acteurs", columns: ["acteursid", "name"], count: 1, samples: [] },
  { name: "demandes", columns: ["id", "acteursid", "version"], count: 1, samples: [] },
  { name: "notes", columns: ["id", "version"], count: 0, samples: [] },
];
const sql = `ALTER TABLE ONLY onagre.acteurs ADD CONSTRAINT pk_acteurs PRIMARY KEY (acteursid);
ALTER TABLE ONLY onagre.demandes ADD CONSTRAINT actors FOREIGN KEY (acteursid) REFERENCES onagre.acteurs(acteursid);
ALTER TABLE ONLY "onagre"."demandes" ADD CONSTRAINT "pk_demandes" PRIMARY KEY ("id", "version");
ALTER TABLE onagre.notes ADD CONSTRAINT composite FOREIGN KEY (id, version) REFERENCES onagre.demandes(id, version) ON DELETE CASCADE;`;

it("distinguishes primary keys, outgoing and incoming references, preserving composite keys", () => {
  const parsed = withConstraints(sql, tables);
  expect(fieldRelations(parsed, "acteurs", "acteursid")).toMatchObject({
    primaryKey: ["acteursid"],
    outgoing: [],
    incoming: [{ sourceTable: "demandes", columns: ["acteursid"] }],
  });
  expect(fieldRelations(parsed, "demandes", "acteursid")).toMatchObject({
    primaryKey: [],
    outgoing: [{ targetTable: "acteurs", targetColumns: ["acteursid"] }],
    incoming: [],
  });
  expect(fieldRelations(parsed, "demandes", "id")).toMatchObject({
    primaryKey: ["id", "version"],
    incoming: [
      { sourceTable: "notes", columns: ["id", "version"], targetColumns: ["id", "version"] },
    ],
  });
  expect(fieldRelations(parsed, "acteurs", "name")).toEqual({
    primaryKey: [],
    outgoing: [],
    incoming: [],
  });
  expect(tables[0].constraints).toBeUndefined();
});

it("does not report absent relations for legacy snapshots with unknown constraints", () => {
  expect(fieldRelations(tables, "acteurs", "acteursid")).toBeUndefined();
  expect(
    fieldRelations(
      [...withConstraints(sql, tables).slice(0, 2), tables[2]],
      "acteurs",
      "acteursid",
    ),
  ).toBeUndefined();
});

it("rejects unsupported constraints and missing target columns instead of inventing links", () => {
  expect(() => withConstraints(sql.replace("onagre.notes", "other.notes"), tables)).toThrow(
    "Unsupported",
  );
  expect(() =>
    withConstraints(
      sql.replace("REFERENCES onagre.acteurs(acteursid)", "REFERENCES onagre.acteurs(missing)"),
      tables,
    ),
  ).toThrow("target");
});
