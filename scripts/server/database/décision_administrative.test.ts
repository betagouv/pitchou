import { describe, it, expect } from "vitest";
import {
  getDossierIdFromDecisionAdministrative,
  supprimerDécisionAdministrative,
} from "./décision_administrative.js";
import { fakeDatabase } from "./fakeDatabase.js";

describe("getDossierIdFromDecisionAdministrative", () => {
  it("queries the décision_administrative table", async () => {
    const db = fakeDatabase()
      .selectResolves([{ dossier: 42 }])
      .build();
    // @ts-ignore: id is a branded string, the test passes a literal
    await getDossierIdFromDecisionAdministrative("some-id", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["décision_administrative"]));
  });

  it("filters by the given id", async () => {
    const db = fakeDatabase()
      .selectResolves([{ dossier: 42 }])
      .build();
    // @ts-ignore
    await getDossierIdFromDecisionAdministrative("some-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "some-id" });
  });

  it("returns the dossier id when the row exists", async () => {
    const db = fakeDatabase()
      .selectResolves([{ dossier: 42 }])
      .build();
    // @ts-ignore
    const result = await getDossierIdFromDecisionAdministrative("some-id", db.knex);
    expect(result).toBe(42);
  });

  it("returns undefined when the row does not exist", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    // @ts-ignore
    const result = await getDossierIdFromDecisionAdministrative("missing", db.knex);
    expect(result).toBeUndefined();
  });
});

describe("supprimerDécisionAdministrative", () => {
  it("only touches the décision_administrative table", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await supprimerDécisionAdministrative("some-id", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["décision_administrative"]));
  });

  it("filters the delete by the given id", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await supprimerDécisionAdministrative("some-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "some-id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
