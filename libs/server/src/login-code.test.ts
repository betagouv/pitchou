import { createHash } from "node:crypto";

import { describe, it, expect } from "vitest";

import {
  createLoginCode,
  verifyLoginCode,
  deleteExpiredLoginCodes,
  MAX_ATTEMPTS,
} from "./login-code.ts";
import { fakeDatabase } from "./database/fakeDatabase.ts";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("createLoginCode", () => {
  it("only touches the login_code table", async () => {
    const db = fakeDatabase().build();
    await createLoginCode("agent@pitchou.test", db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["login_code"]));
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("returns a 6-digit code", async () => {
    const db = fakeDatabase().build();
    const code = await createLoginCode("a@b.fr", db.knex);
    expect(code).toMatch(/^[0-9]{6}$/);
  });

  // Security contract: the email carries the plaintext code, the DB only ever
  // stores its sha256 hash, so a DB read-leak can't be replayed.
  it("stores the hash of the code, never the code itself", async () => {
    const db = fakeDatabase().build();
    const code = await createLoginCode("a@b.fr", db.knex);
    const inserted = db.insert.mock.calls[0][0] as { code_hash: string; attempts: number };
    expect(inserted.code_hash).toBe(sha256(code));
    expect(inserted.code_hash).not.toBe(code);
    expect(inserted.attempts).toBe(0);
  });

  it("normalizes the email and sets a future expiry", async () => {
    const db = fakeDatabase().build();
    const before = Date.now();
    await createLoginCode("  Agent@Pitchou.TEST ", db.knex);
    const inserted = db.insert.mock.calls[0][0] as { email: string; date_expired: Date };
    expect(inserted.email).toBe("agent@pitchou.test");
    expect(inserted.date_expired.getTime()).toBeGreaterThan(before);
  });
});

describe("verifyLoginCode", () => {
  it("looks the row up by normalized email and guards on expiry", async () => {
    const db = fakeDatabase()
      .selectResolves([{ code_hash: sha256("123456"), attempts: 0 }])
      .build();
    await verifyLoginCode("A@B.fr", "123456", db.knex);
    expect(db.where).toHaveBeenCalledWith({ email: "a@b.fr" });
    expect(db.andWhere).toHaveBeenCalledWith("date_expired", ">", "now()");
  });

  it("returns true and consumes the code on a match", async () => {
    const db = fakeDatabase()
      .selectResolves([{ code_hash: sha256("123456"), attempts: 0 }])
      .build();
    const ok = await verifyLoginCode("a@b.fr", "123456", db.knex);
    expect(ok).toBe(true);
    // Single-use: the row is deleted, not merely updated.
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns false and spends one attempt on a wrong code", async () => {
    const db = fakeDatabase()
      .selectResolves([{ code_hash: sha256("123456"), attempts: 1 }])
      .build();
    const ok = await verifyLoginCode("a@b.fr", "000000", db.knex);
    expect(ok).toBe(false);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.update.mock.calls[0][0]).toEqual({ attempts: 2 });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("burns the code once the attempt budget is exhausted", async () => {
    const db = fakeDatabase()
      .selectResolves([{ code_hash: sha256("123456"), attempts: MAX_ATTEMPTS }])
      .build();
    const ok = await verifyLoginCode("a@b.fr", "123456", db.knex);
    expect(ok).toBe(false);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns false when no live code matches", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    expect(await verifyLoginCode("a@b.fr", "123456", db.knex)).toBe(false);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe("deleteExpiredLoginCodes", () => {
  it("deletes rows past their expiry and returns the count", async () => {
    const db = fakeDatabase().deleteResolves(2).build();
    const count = await deleteExpiredLoginCodes(db.knex);
    expect(db.where).toHaveBeenCalledWith("date_expired", "<", "now()");
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(count).toBe(2);
  });
});
