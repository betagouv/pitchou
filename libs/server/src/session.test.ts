import { createHash } from "node:crypto";

import { describe, it, expect } from "vitest";

import { createSession, readSession, deleteSession, deleteExpiredSessions } from "./session.ts";
import { fakeDatabase } from "./database/fakeDatabase.ts";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("createSession", () => {
  const newSession = { email: "agent@pitchou.test", nom: "Agent Test", idToken: "id-token-xyz" };

  it("only touches the session table", async () => {
    const db = fakeDatabase().build();
    await createSession(newSession, db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["session"]));
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  // Security contract: the cookie carries the raw token, the DB only ever stores
  // its sha256 hash, so a DB read-leak can't be replayed as a cookie.
  it("returns the raw token but stores only its sha256 hash", async () => {
    const db = fakeDatabase().build();
    const token = await createSession(newSession, db.knex);
    const inserted = db.insert.mock.calls[0][0] as { id: string };
    expect(inserted.id).toBe(sha256(token));
    expect(inserted.id).not.toBe(token);
  });

  it("returns a URL-safe token with at least 128 bits of entropy", async () => {
    const db = fakeDatabase().build();
    const token = await createSession(newSession, db.knex);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 random bytes ≈ 43 base64url chars, well above the ~22-char / 128-bit floor.
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("generates a distinct token on every call (100 samples, all unique)", async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const db = fakeDatabase().build();
      tokens.add(await createSession(newSession, db.knex));
    }
    expect(tokens.size).toBe(100);
  });

  it("stores the identity and a future expiry", async () => {
    const db = fakeDatabase().build();
    const before = Date.now();
    await createSession(newSession, db.knex);
    const inserted = db.insert.mock.calls[0][0] as {
      email: string;
      nom: string;
      id_token: string | null;
      date_expired: Date;
    };
    expect(inserted.email).toBe("agent@pitchou.test");
    expect(inserted.nom).toBe("Agent Test");
    expect(inserted.id_token).toBe("id-token-xyz");
    expect(inserted.date_expired.getTime()).toBeGreaterThan(before);
  });

  it("accepts a null id_token", async () => {
    const db = fakeDatabase().build();
    await createSession({ email: "a@b.fr", nom: "", idToken: null }, db.knex);
    const inserted = db.insert.mock.calls[0][0] as { id_token: string | null };
    expect(inserted.id_token).toBeNull();
  });
});

describe("readSession", () => {
  const token = "raw-token";

  it("looks the row up by the hashed token and guards on expiry", async () => {
    const db = fakeDatabase()
      .selectResolves([{ email: "a@b.fr", nom: "Nom", id_token: "tok" }])
      .build();
    await readSession(token, db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: sha256(token) });
    expect(db.andWhere).toHaveBeenCalledWith("date_expired", ">", "now()");
  });

  it("returns the identity for a live session", async () => {
    const db = fakeDatabase()
      .selectResolves([{ email: "a@b.fr", nom: "Nom", id_token: "tok" }])
      .build();
    const session = await readSession(token, db.knex);
    expect(session).toEqual({ email: "a@b.fr", nom: "Nom", idToken: "tok" });
  });

  it("slides the expiry, throttled to rows older than the renewal window", async () => {
    const db = fakeDatabase()
      .selectResolves([{ email: "a@b.fr", nom: "Nom", id_token: "tok" }])
      .build();
    await readSession(token, db.knex);
    // The slide only updates rows whose expiry is below the throttle threshold.
    expect(db.andWhere).toHaveBeenCalledWith("date_expired", "<", expect.any(Date));
    expect(db.update).toHaveBeenCalledTimes(1);
    const updated = db.update.mock.calls[0][0] as { date_expired: Date };
    expect(updated.date_expired).toBeInstanceOf(Date);
  });

  it("returns null and never slides when no live session matches", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    const session = await readSession(token, db.knex);
    expect(session).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("deleteSession", () => {
  const token = "raw-token";

  it("deletes the row keyed by the hashed token and returns its id_token", async () => {
    const db = fakeDatabase()
      .deleteReturning([{ id_token: "stored-id-token" }])
      .build();
    const idToken = await deleteSession(token, db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: sha256(token) });
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(idToken).toBe("stored-id-token");
  });

  it("returns null when nothing was deleted", async () => {
    const db = fakeDatabase().deleteReturning([]).build();
    expect(await deleteSession(token, db.knex)).toBeNull();
  });

  it("returns null when the deleted row had no id_token", async () => {
    const db = fakeDatabase()
      .deleteReturning([{ id_token: null }])
      .build();
    expect(await deleteSession(token, db.knex)).toBeNull();
  });
});

describe("deleteExpiredSessions", () => {
  it("deletes rows past their expiry and returns the count", async () => {
    const db = fakeDatabase().deleteResolves(3).build();
    const count = await deleteExpiredSessions(db.knex);
    expect(db.where).toHaveBeenCalledWith("date_expired", "<", "now()");
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(count).toBe(3);
  });
});
