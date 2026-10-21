import { expect, test } from "vitest";
import { RequestError } from "#lib/shared/createCapObjectFromURLs/requestWrappers.ts";
import { importErrorMessage, PrescriptionImportError } from "./errors.ts";

test("keeps actionable spreadsheet validation messages", () => {
  expect(
    importErrorMessage(new PrescriptionImportError("Corrigez la colonne Surface compensée.")),
  ).toBe("Corrigez la colonne Surface compensée.");
});

test.each([
  new RequestError(400, 'insert into "prescription" invalid input syntax'),
  new Error("SQL error"),
  new TypeError("Failed to fetch"),
  "Internal exception",
])("hides technical details of unexpected errors", (cause) => {
  const message = importErrorMessage(cause);
  expect(message).not.toMatch(/SQL|insert into|syntax|fetch|exception/u);
  expect(message).toContain("contactez l'équipe Pitchou");
});

test.each([401, 403])("explains expired access for status %s", (status) => {
  expect(importErrorMessage(new RequestError(status, "Forbidden"))).toContain("Rechargez la page");
});
