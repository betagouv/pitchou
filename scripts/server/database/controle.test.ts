import { describe, it, expect } from "vitest";
import { getDossierIdFromControle, supprimerContrôle } from "./controle.js";
import { fakeDatabase } from "./fakeDatabase.js";

describe("getDossierIdFromControle", () => {
  it("walks contrôle → prescription → décision_administrative", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("contrôle", [{ prescription: "p-id" }])
      .selectResolvesForTable("prescription", [{ décision_administrative: "da-id" }])
      .selectResolvesForTable("décision_administrative", [{ dossier: 42 }])
      .build();
    // @ts-ignore: id is a branded string, the test passes a literal
    await getDossierIdFromControle("c-id", db.knex);
    const tables = db.table.mock.calls.map(([name]) => name);
    expect(tables).toEqual(["contrôle", "prescription", "décision_administrative"]);
  });

  it("returns the dossier id reached through the chain", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("contrôle", [{ prescription: "p-id" }])
      .selectResolvesForTable("prescription", [{ décision_administrative: "da-id" }])
      .selectResolvesForTable("décision_administrative", [{ dossier: 42 }])
      .build();
    // @ts-ignore
    const result = await getDossierIdFromControle("c-id", db.knex);
    expect(result).toBe(42);
  });

  it("returns undefined when the contrôle does not exist", async () => {
    const db = fakeDatabase().selectResolvesForTable("contrôle", []).build();
    // @ts-ignore
    const result = await getDossierIdFromControle("missing", db.knex);
    expect(result).toBeUndefined();
  });
});

describe("supprimerContrôle", () => {
  it("only touches the contrôle table", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await supprimerContrôle("c-id", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["contrôle"]));
  });

  it("filters the delete by the given id", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await supprimerContrôle("c-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "c-id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
