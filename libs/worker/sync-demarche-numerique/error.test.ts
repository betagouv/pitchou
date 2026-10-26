import { expect, test } from "vitest";
import { synchronizationErrorMessage } from "./error.ts";

test("a large Knex insert error keeps the PostgreSQL cause without its SQL", () => {
  const error = new Error(
    `insert into "action_dossier" values ${"($1),".repeat(30_000)} - bind message has 53308 parameter formats but 0 parameters`,
  );
  expect(synchronizationErrorMessage(error)).toBe(
    "bind message has 53308 parameter formats but 0 parameters",
  );
});

test("other errors remain readable and saved messages are bounded", () => {
  expect(synchronizationErrorMessage(new Error("DN unavailable - retry later"))).toBe(
    "DN unavailable - retry later",
  );
  expect(synchronizationErrorMessage("Network timeout")).toBe("Network timeout");
  expect(synchronizationErrorMessage(new Error("x".repeat(10_000))).length).toBeLessThanOrEqual(
    2_001,
  );
});
