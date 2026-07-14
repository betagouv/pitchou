import { describe, it, expect } from "vitest";
import { creerPersonne, creerPersonneOuMettreAJourCodeAcces, creerPersonnes } from "./personne.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import { pgUniqueViolation } from "./pgErrors.js";

describe("créerPersonneOuMettreÀJourCodeAccès", () => {
  describe("when the email does not yet exist (insert succeeds)", () => {
    it("only touches the personne table", async () => {
      const db = fakeDatabase().build();
      await creerPersonneOuMettreAJourCodeAcces("foo@bar.fr", db.knex);
      const tables = new Set(db.table.mock.calls.map(([name]) => name));
      expect(tables).toEqual(new Set(["personne"]));
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it("inserts the personne with the email lowercased", async () => {
      const db = fakeDatabase().build();
      await creerPersonneOuMettreAJourCodeAcces("Foo.BAR@Example.COM", db.knex);
      const inserted = db.insert.mock.calls[0][0] as { email: string };
      expect(inserted.email).toBe("foo.bar@example.com");
    });

    it("inserts the personne with empty nom and prénoms", async () => {
      const db = fakeDatabase().build();
      await creerPersonneOuMettreAJourCodeAcces("foo@bar.fr", db.knex);
      const inserted = db.insert.mock.calls[0][0] as { nom: string; prénoms: string };
      expect(inserted.nom).toBe("");
      expect(inserted.prénoms).toBe("");
    });
  });

  describe("when a personne already exists (unique-constraint violation)", () => {
    it("updates the personne filtered by email", async () => {
      const db = fakeDatabase().insertRejects(pgUniqueViolation()).build();
      await creerPersonneOuMettreAJourCodeAcces("foo@bar.fr", db.knex);
      expect(db.where).toHaveBeenCalledWith({ email: "foo@bar.fr" });
    });

    it("updates with the freshly generated code_accès", async () => {
      const db = fakeDatabase().insertRejects(pgUniqueViolation()).build();
      const returned = await creerPersonneOuMettreAJourCodeAcces("foo@bar.fr", db.knex);
      expect(db.update).toHaveBeenCalledWith({ code_accès: returned });
    });
  });

  describe("when the insert fails for any other reason", () => {
    it("propagates the error instead of silently falling through to update", async () => {
      const originalError = new Error("connection refused");
      const db = fakeDatabase().insertRejects(originalError).build();
      await expect(creerPersonneOuMettreAJourCodeAcces("foo@bar.fr", db.knex)).rejects.toBe(
        originalError,
      );
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe("the generated code_accès", () => {
    it("is distinct on every call (100 samples, all unique)", async () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const db = fakeDatabase().build();
        codes.add(await creerPersonneOuMettreAJourCodeAcces(`u${i}@x.fr`, db.knex));
      }
      expect(codes.size).toBe(100);
    });

    // Security contract: ≥ 22 base64url chars ≈ 128 bits of entropy — the
    // conventional minimum for an unguessable secret.
    it("is at least 22 characters long (≈128 bits at base64url)", async () => {
      const db = fakeDatabase().build();
      const code = await creerPersonneOuMettreAJourCodeAcces("foo@bar.fr", db.knex);
      expect(code.length).toBeGreaterThanOrEqual(22);
    });

    it("only contains URL-safe characters", async () => {
      const db = fakeDatabase().build();
      const code = await creerPersonneOuMettreAJourCodeAcces("foo@bar.fr", db.knex);
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});

describe("créerPersonnes", () => {
  it("only touches the personne table", async () => {
    const db = fakeDatabase().build();
    await creerPersonnes([{ email: "a@x.fr", nom: "", prénoms: "", code_accès: "x" }], db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["personne"]));
  });

  it("lowercases the email of every personne before inserting", async () => {
    const db = fakeDatabase().build();
    await creerPersonnes(
      [
        { email: "Foo@X.FR", nom: "", prénoms: "", code_accès: "a" },
        { email: "Bar@Y.fr", nom: "", prénoms: "", code_accès: "b" },
      ],
      db.knex,
    );
    const insertedPersonnes = db.insert.mock.calls[0][0] as { email: string }[];
    expect(insertedPersonnes[0].email).toBe("foo@x.fr");
    expect(insertedPersonnes[1].email).toBe("bar@y.fr");
  });

  it("leaves personnes without an email untouched", async () => {
    const db = fakeDatabase().build();
    await creerPersonnes([{ nom: "Smith", prénoms: "Alice", code_accès: "a" }], db.knex);
    const insertedPersonnes = db.insert.mock.calls[0][0] as { email?: string }[];
    expect(insertedPersonnes[0].email).toBeUndefined();
  });

  it("asks the database to return the inserted ids", async () => {
    const db = fakeDatabase().build();
    await creerPersonnes([{ email: "a@x.fr", nom: "", prénoms: "", code_accès: "x" }], db.knex);
    expect(db.insert.mock.calls[0][1]).toEqual(["id"]);
  });

  it("returns the rows the database returned", async () => {
    const db = fakeDatabase()
      .insertResolves([{ id: 42 }, { id: 43 }])
      .build();
    const result = await creerPersonnes(
      [
        { email: "a@x.fr", nom: "", prénoms: "", code_accès: "x" },
        { email: "b@x.fr", nom: "", prénoms: "", code_accès: "y" },
      ],
      db.knex,
    );
    expect(result).toEqual([{ id: 42 }, { id: 43 }]);
  });

  it("does not mutate the input personnes", async () => {
    const personnes = [{ email: "Foo@X.FR", nom: "", prénoms: "", code_accès: "x" }];
    const before = structuredClone(personnes);
    const db = fakeDatabase().build();
    await creerPersonnes(personnes, db.knex);
    expect(personnes).toEqual(before);
  });

  it("does not touch the database when given an empty array", async () => {
    const db = fakeDatabase().build();
    const result = await creerPersonnes([], db.knex);
    expect(db.table).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe("créerPersonne", () => {
  it("does not mutate the input personne", async () => {
    const personne = { email: "Foo@X.FR", nom: "", prénoms: "", code_accès: "x" };
    const before = structuredClone(personne);
    const db = fakeDatabase().build();
    await creerPersonne(personne, db.knex);
    expect(personne).toEqual(before);
  });
});
