import { expect, test } from "vitest";
import { truncateFilename } from "./filename.ts";

test.each([null, ""])("labels missing filenames %j", (name) => {
  expect(truncateFilename(name)).toBe("(fichier sans nom)");
});

test.each(["rapport.pdf", "x".repeat(43)])("keeps filenames within the limit: %s", (name) => {
  expect(truncateFilename(name)).toBe(name);
});

test("keeps the extension of long filenames", () => {
  expect(truncateFilename("x".repeat(50) + ".pdf")).toBe("x".repeat(36) + "(…).pdf");
});

test.each(["x".repeat(50), "." + "x".repeat(50), "x." + "y".repeat(50)])(
  "bounds filenames without a usable extension: %s",
  (name) => {
    expect(truncateFilename(name)).toBe(name.slice(0, 40) + "(…)");
    expect(truncateFilename(name)).toHaveLength(43);
  },
);

test("supports a custom limit and uses only the last extension", () => {
  expect(truncateFilename("archive.long-name.tar.gz", 15)).toBe("archive.l(…).gz");
});
