import { describe, it, expect, vi } from "vitest";
import type { Knex } from "knex";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";
import {
  getDossierIdFromPrescription,
  deletePrescription,
  addPrescriptionsEtControles,
} from "./prescription.js";
import { fakeDatabase } from "./fakeDatabase.js";

describe("getDossierIdFromPrescription", () => {
  it("queries the prescription table then the decision_administrative table", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("prescription", [{ decision_administrative: "da-id" }])
      .selectResolvesForTable("decision_administrative", [{ dossier: 42 }])
      .build();
    // @ts-ignore: id is a branded string, the test passes a literal
    await getDossierIdFromPrescription("p-id", db.knex);
    const tables = db.table.mock.calls.map(([name]) => name);
    expect(tables).toEqual(["prescription", "decision_administrative"]);
  });

  it("returns the dossier id reached through the decision_administrative", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("prescription", [{ decision_administrative: "da-id" }])
      .selectResolvesForTable("decision_administrative", [{ dossier: 42 }])
      .build();
    // @ts-ignore
    const result = await getDossierIdFromPrescription("p-id", db.knex);
    expect(result).toBe(42);
  });

  it("returns undefined when the prescription does not exist", async () => {
    const db = fakeDatabase().selectResolvesForTable("prescription", []).build();
    // @ts-ignore
    const result = await getDossierIdFromPrescription("missing", db.knex);
    expect(result).toBeUndefined();
  });

  it("returns undefined when the parent decision_administrative is missing", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("prescription", [{ decision_administrative: "da-id" }])
      .selectResolvesForTable("decision_administrative", [])
      .build();
    // @ts-ignore
    const result = await getDossierIdFromPrescription("p-id", db.knex);
    expect(result).toBeUndefined();
  });
});

describe("deletePrescription", () => {
  it("only touches the prescription table", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await deletePrescription("p-id", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["prescription"]));
  });

  it("filters the delete by the given id", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await deletePrescription("p-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "p-id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});

describe("addPrescriptionsEtControles", () => {
  function database(failingTable?: string) {
    const commit = vi.fn();
    const rollback = vi.fn();
    const insert = vi.fn();
    let prescriptionNumber = 0;
    const transaction = vi.fn((table: string) => ({
      insert: (values: unknown) => {
        insert(table, values);
        return {
          returning: async () => {
            if (table === failingTable) throw new Error(`${table} insert failed`);
            return [{ id: table === "prescription" ? `p-${++prescriptionNumber}` : "c-1" }];
          },
        };
      },
    }));
    const knex = {
      transaction: vi.fn(async (callback) => {
        try {
          const result = await callback(transaction);
          commit();
          return result;
        } catch (error) {
          rollback();
          throw error;
        }
      }),
    } as unknown as Knex;
    return { knex, insert, commit, rollback };
  }

  const prescriptions = [
    { decision_administrative: "da-id", controles: [{ result: "Conforme" }] },
    { decision_administrative: "da-id", controles: [] },
    { decision_administrative: "da-id" },
  ] as Omit<FrontEndPrescription, "id">[];

  it("inserts every prescription and its controls atomically without mutating input", async () => {
    const db = database();
    const input = structuredClone(prescriptions);
    Object.freeze(input);
    for (const prescription of input) {
      Object.freeze(prescription);
      for (const controle of prescription.controles ?? []) Object.freeze(controle);
      if (prescription.controles) Object.freeze(prescription.controles);
    }
    await expect(addPrescriptionsEtControles(input, db.knex)).resolves.toEqual([
      ["c-1"],
      undefined,
      undefined,
    ]);
    expect(input).toEqual(prescriptions);
    expect(db.insert.mock.calls.filter(([table]) => table === "prescription")).toEqual([
      ["prescription", { decision_administrative: "da-id" }],
      ["prescription", { decision_administrative: "da-id" }],
      ["prescription", { decision_administrative: "da-id" }],
    ]);
    expect(db.insert).toHaveBeenCalledWith("controle", [
      { result: "Conforme", prescription: "p-1" },
    ]);
    expect(db.commit).toHaveBeenCalledOnce();
    expect(db.rollback).not.toHaveBeenCalled();
  });

  it.each(["prescription", "controle"])(
    "rejects and rolls back on a %s insert failure",
    async (table) => {
      const db = database(table);
      await expect(addPrescriptionsEtControles(prescriptions, db.knex)).rejects.toThrow(
        `${table} insert failed`,
      );
      expect(db.commit).not.toHaveBeenCalled();
      expect(db.rollback).toHaveBeenCalledOnce();
    },
  );

  it("accepts an empty batch without inserting anything", async () => {
    const db = database();
    await expect(addPrescriptionsEtControles([], db.knex)).resolves.toEqual([]);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
