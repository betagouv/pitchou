import type { ControleId } from "@pitchou/types/database/public/Controle.ts";
const controleId = "c-id" as ControleId;
const missingId = "missing" as ControleId;
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
    await getDossierIdFromControle(controleId, db.knex);
    const tables = db.table.mock.calls.map(([name]) => name);
    expect(tables).toEqual(["controle", "prescription", "decision_administrative"]);
  });

  it("returns the dossier id reached through the chain", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("controle", [{ prescription: "p-id" }])
      .selectResolvesForTable("prescription", [{ decision_administrative: "da-id" }])
      .selectResolvesForTable("decision_administrative", [{ dossier: 42 }])
      .build();
    const result = await getDossierIdFromControle(controleId, db.knex);
    expect(result).toBe(42);
  });

  it("returns undefined when the controle does not exist", async () => {
    const db = fakeDatabase().selectResolvesForTable("controle", []).build();
    const result = await getDossierIdFromControle(missingId, db.knex);
    expect(result).toBeUndefined();
  });
});

describe("deleteControle", () => {
  it("only touches the controle table", async () => {
    const db = fakeDatabase().build();
    await deleteControle(controleId, db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["controle"]));
  });

  it("filters the delete by the given id", async () => {
    const db = fakeDatabase().build();
    await deleteControle(controleId, db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "c-id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
