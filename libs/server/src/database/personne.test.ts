import { describe, it, expect } from "vitest";
import { createPersonne, createPersonnes } from "./personne.ts";
import { fakeDatabase } from "./fakeDatabase.js";

describe("créerPersonnes", () => {
  it("only touches the personne table", async () => {
    const db = fakeDatabase().build();
    await createPersonnes(
      [{ email: "a@x.fr", last_name: "", first_names: "", access_code: "x" }],
      db.knex,
    );
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["personne"]));
  });

  it("lowercases the email of every personne before inserting", async () => {
    const db = fakeDatabase().build();
    await createPersonnes(
      [
        { email: "Foo@X.FR", last_name: "", first_names: "", access_code: "a" },
        { email: "Bar@Y.fr", last_name: "", first_names: "", access_code: "b" },
      ],
      db.knex,
    );
    const insertedPersonnes = db.insert.mock.calls[0][0] as { email: string }[];
    expect(insertedPersonnes[0].email).toBe("foo@x.fr");
    expect(insertedPersonnes[1].email).toBe("bar@y.fr");
  });

  it("leaves personnes without an email untouched", async () => {
    const db = fakeDatabase().build();
    await createPersonnes(
      [{ last_name: "Smith", first_names: "Alice", access_code: "a" }],
      db.knex,
    );
    const insertedPersonnes = db.insert.mock.calls[0][0] as { email?: string }[];
    expect(insertedPersonnes[0].email).toBeUndefined();
  });

  it("asks the database to return the inserted ids", async () => {
    const db = fakeDatabase().build();
    await createPersonnes(
      [{ email: "a@x.fr", last_name: "", first_names: "", access_code: "x" }],
      db.knex,
    );
    expect(db.insert.mock.calls[0][1]).toEqual(["id"]);
  });

  it("returns the rows the database returned", async () => {
    const db = fakeDatabase()
      .insertResolves([{ id: 42 }, { id: 43 }])
      .build();
    const result = await createPersonnes(
      [
        { email: "a@x.fr", last_name: "", first_names: "", access_code: "x" },
        { email: "b@x.fr", last_name: "", first_names: "", access_code: "y" },
      ],
      db.knex,
    );
    expect(result).toEqual([{ id: 42 }, { id: 43 }]);
  });

  it("does not mutate the input personnes", async () => {
    const personnes = [{ email: "Foo@X.FR", last_name: "", first_names: "", access_code: "x" }];
    const before = structuredClone(personnes);
    const db = fakeDatabase().build();
    await createPersonnes(personnes, db.knex);
    expect(personnes).toEqual(before);
  });

  it("does not touch the database when given an empty array", async () => {
    const db = fakeDatabase().build();
    const result = await createPersonnes([], db.knex);
    expect(db.table).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe("créerPersonne", () => {
  it("does not mutate the input personne", async () => {
    const personne = { email: "Foo@X.FR", last_name: "", first_names: "", access_code: "x" };
    const before = structuredClone(personne);
    const db = fakeDatabase().build();
    await createPersonne(personne, db.knex);
    expect(personne).toEqual(before);
  });
});
