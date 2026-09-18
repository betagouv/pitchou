import { afterEach, expect, test, vi } from "vitest";
import { deleteFichiersWithoutOtherReferences } from "@pitchou/server/database/fichier.ts";
import * as objectStorage from "@pitchou/server/objectStorage.ts";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { s3HasKey } from "../helpers/fileStorage.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

test("deletes an orphan object only after the caller commits", async () => {
  const file = await createFichierS3(db, await getTestS3());
  const trx = await db.transaction();
  try {
    await deleteFichiersWithoutOtherReferences([file.id], trx);
    expect(await s3HasKey(file.key)).toBe(true);
    await trx.commit();
    await expect.poll(() => s3HasKey(file.key)).toBe(false);
  } finally {
    if (!trx.isCompleted()) await trx.rollback();
  }
});

test("keeps a committed deletion successful if post-commit S3 cleanup fails", async () => {
  const file = await createFichierS3(db, await getTestS3());
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(objectStorage, "deleteObject").mockRejectedValueOnce(new Error("S3 unavailable"));
  await db.transaction(async (trx) => {
    await deleteFichiersWithoutOtherReferences([file.id], trx);
  });
  await expect.poll(() => error.mock.calls.length).toBe(1);
  expect(await db("file").where({ id: file.id })).toHaveLength(0);
  expect(await s3HasKey(file.key)).toBe(true);
});

test("retains the object when PostgreSQL turns COMMIT on an aborted transaction into ROLLBACK", async () => {
  const file = await createFichierS3(db, await getTestS3());
  const trx = await db.transaction();
  try {
    await deleteFichiersWithoutOtherReferences([file.id], trx);
    await expect(trx.raw("SELECT 1 / 0")).rejects.toThrow(/division by zero/);
    await trx.commit();
    expect(await db("file").where({ id: file.id })).toHaveLength(1);
    expect(await s3HasKey(file.key)).toBe(true);
  } finally {
    if (!trx.isCompleted()) await trx.rollback();
  }
});

test("does not treat an explicit rollback without an error as a commit", async () => {
  const file = await createFichierS3(db, await getTestS3());
  const trx = await db.transaction();
  try {
    await deleteFichiersWithoutOtherReferences([file.id], trx);
    await trx.rollback();
    await trx.executionPromise;
    expect(await db("file").where({ id: file.id })).toHaveLength(1);
    expect(await s3HasKey(file.key)).toBe(true);
  } finally {
    if (!trx.isCompleted()) await trx.rollback();
  }
});

test.each([true, false])(
  "waits for the outer transaction after a savepoint, commit=%s",
  async (commit) => {
    const file = await createFichierS3(db, await getTestS3());
    const trx = await db.transaction();
    try {
      await trx.transaction(async (nested) => {
        await deleteFichiersWithoutOtherReferences([file.id], nested);
      });
      expect(await s3HasKey(file.key)).toBe(true);
      if (commit) {
        await trx.commit();
        await expect.poll(() => s3HasKey(file.key)).toBe(false);
      } else {
        await trx.rollback();
        expect(await db("file").where({ id: file.id })).toHaveLength(1);
        expect(await s3HasKey(file.key)).toBe(true);
      }
    } finally {
      if (!trx.isCompleted()) await trx.rollback();
    }
  },
);

test("preserves the object when a savepoint rolls back but its parent commits", async () => {
  const file = await createFichierS3(db, await getTestS3());
  await db.transaction(async (trx) => {
    const nested = await trx.transaction();
    try {
      await deleteFichiersWithoutOtherReferences([file.id], nested);
    } finally {
      await nested.rollback();
    }
  });
  expect(await db("file").where({ id: file.id })).toHaveLength(1);
  expect(await s3HasKey(file.key)).toBe(true);
});
