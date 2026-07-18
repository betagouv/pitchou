import { describe, it, expect } from "vitest";
import { createPersonne, createPersonneOrUpdateCodeAcces, createPersonnes } from "./personne.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import { pgUniqueViolation } from "./pgErrors.js";

describe("créerPersonneOuMettreÀJourCodeAccès", () => {
  describe("when the email does not yet exist (insert succeeds)", () => {
    it("only touches the personne table", async () => {
      const db = fakeDatabase().build();
      await createPersonneOrUpdateCodeAcces("foo@bar.fr", db.knex);
      const tables = new Set(db.table.mock.calls.map(([name]) => name));
      expect(tables).toEqual(new Set(["personne"]));
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it("inserts the personne with the email lowercased", async () => {
      const db = fakeDatabase().build();
      await createPersonneOrUpdateCodeAcces("Foo.BAR@Example.COM", db.knex);
      const inserted = db.insert.mock.calls[0][0] as { email: string };
      expect(inserted.email).toBe("foo.bar@example.com");
    });

    it("inserts the personne with empty last_name and first_names", async () => {
      const db = fakeDatabase().build();
      await createPersonneOrUpdateCodeAcces("foo@bar.fr", db.knex);
      const inserted = db.insert.mock.calls[0][0] as { last_name: string; first_names: string };
      expect(inserted.last_name).toBe("");
      expect(inserted.first_names).toBe("");
    });
  });

  describe("when a personne already exists (unique-constraint violation)", () => {
    it("updates the personne filtered by email", async () => {
      const db = fakeDatabase().insertRejects(pgUniqueViolation()).build();
      await createPersonneOrUpdateCodeAcces("foo@bar.fr", db.knex);
      expect(db.where).toHaveBeenCalledWith({ email: "foo@bar.fr" });
    });

    it("updates with the freshly generated access_code", async () => {
      const db = fakeDatabase().insertRejects(pgUniqueViolation()).build();
      const returned = await createPersonneOrUpdateCodeAcces("foo@bar.fr", db.knex);
      expect(db.update).toHaveBeenCalledWith({ access_code: returned });
    });
  });

  describe("when the insert fails for any other reason", () => {
    it("propagates the error instead of silently falling through to update", async () => {
      const originalError = new Error("connection refused");
      const db = fakeDatabase().insertRejects(originalError).build();
      await expect(createPersonneOrUpdateCodeAcces("foo@bar.fr", db.knex)).rejects.toBe(
        originalError,
      );
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe("the generated access_code", () => {
    it("is distinct on every call (100 samples, all unique)", async () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const db = fakeDatabase().build();
        codes.add(await createPersonneOrUpdateCodeAcces(`u${i}@x.fr`, db.knex));
      }
      expect(codes.size).toBe(100);
    });

    // Security contract: ≥ 22 base64url chars ≈ 128 bits of entropy — the
    // conventional minimum for an unguessable secret.
    it("is at least 22 characters long (≈128 bits at base64url)", async () => {
      const db = fakeDatabase().build();
      const code = await createPersonneOrUpdateCodeAcces("foo@bar.fr", db.knex);
      expect(code.length).toBeGreaterThanOrEqual(22);
    });

    it("only contains URL-safe characters", async () => {
      const db = fakeDatabase().build();
      const code = await createPersonneOrUpdateCodeAcces("foo@bar.fr", db.knex);
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});

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
