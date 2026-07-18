import { describe, it, expect } from "vitest";
import { getDossierIdFromPrescription, deletePrescription } from "./prescription.js";
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
