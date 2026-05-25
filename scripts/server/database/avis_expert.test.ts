import { describe, it, expect } from "vitest";
import { getDossierIdFromAvisExpert, supprimerAvisExpert } from "./avis_expert.js";
import { fakeDatabase } from "./fakeDatabase.js";

describe("getDossierIdFromAvisExpert", () => {
  it("queries the avis_expert table", async () => {
    const db = fakeDatabase()
      .selectResolves([{ dossier: 42 }])
      .build();
    // @ts-ignore: id is a branded string, the test passes a literal
    await getDossierIdFromAvisExpert("ae-id", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["avis_expert"]));
  });

  it("filters by the given id", async () => {
    const db = fakeDatabase()
      .selectResolves([{ dossier: 42 }])
      .build();
    // @ts-ignore
    await getDossierIdFromAvisExpert("ae-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "ae-id" });
  });

  it("returns the dossier id when the row exists", async () => {
    const db = fakeDatabase()
      .selectResolves([{ dossier: 42 }])
      .build();
    // @ts-ignore
    const result = await getDossierIdFromAvisExpert("ae-id", db.knex);
    expect(result).toBe(42);
  });

  it("returns undefined when the row does not exist", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    // @ts-ignore
    const result = await getDossierIdFromAvisExpert("missing", db.knex);
    expect(result).toBeUndefined();
  });
});

describe("supprimerAvisExpert", () => {
  it("only touches the avis_expert table", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await supprimerAvisExpert("ae-id", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["avis_expert"]));
  });

  it("wraps a single id into an array for whereIn", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await supprimerAvisExpert("ae-id", db.knex);
    expect(db.whereIn).toHaveBeenCalledWith("id", ["ae-id"]);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("passes an array of ids through unchanged", async () => {
    const db = fakeDatabase().build();
    // @ts-ignore
    await supprimerAvisExpert(["a", "b", "c"], db.knex);
    expect(db.whereIn).toHaveBeenCalledWith("id", ["a", "b", "c"]);
  });
});
