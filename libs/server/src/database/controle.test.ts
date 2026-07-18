import { describe, it, expect } from "vitest";
import { getDossierIdFromControle, deleteControle } from "./controle.ts";
import { fakeDatabase } from "./fakeDatabase.js";

describe("getDossierIdFromControle", () => {
  it("walks controle → prescription → decision_administrative", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("controle", [{ prescription: "p-id" }])
      .selectResolvesForTable("prescription", [{ decision_administrative: "da-id" }])
      .selectResolvesForTable("decision_administrative", [{ dossier: 42 }])
      .build();
    // @ts-ignore: id is a branded string, the test passes a literal
    await getDossierIdFromControle("c-id", db.knex);
    const tables = db.table.mock.calls.map(([name]) => name);
    expect(tables).toEqual(["controle", "prescription", "decision_administrative"]);
  });

  it("returns the dossier id reached through the chain", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("controle", [{ prescription: "p-id" }])
      .selectResolvesForTable("prescription", [{ decision_administrative: "da-id" }])
      .selectResolvesForTable("decision_administrative", [{ dossier: 42 }])
      .build();
    // @ts-ignore
    const result = await getDossierIdFromControle("c-id", db.knex);
    expect(result).toBe(42);
  });

  it("returns undefined when the controle does not exist", async () => {
    const db = fakeDatabase().selectResolvesForTable("controle", []).build();
    // @ts-ignore
    const result = await getDossierIdFromControle("missing", db.knex);
    expect(result).toBeUndefined();
  });
});

describe("deleteControle", () => {
  it("only touches the controle table", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await deleteControle("c-id", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["controle"]));
  });

  it("filters the delete by the given id", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await deleteControle("c-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "c-id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
