import test from "node:test";
import assert from "node:assert/strict";
import { parseArguments } from "./args.mjs";

const sha = "a".repeat(64);

test("the staging reviewer is optional", () => {
  assert.deepEqual(parseArguments(["bundle.gz", sha]), {
    apply: false,
    path: "bundle.gz",
    sha256: sha,
    reviewerEmail: undefined,
    limit: undefined,
  });
  assert.deepEqual(parseArguments(["bundle.gz", sha, "20"]).limit, 20);
  assert.deepEqual(parseArguments(["--apply", "bundle.gz", sha]).apply, true);
  const withReviewer = parseArguments(["bundle.gz", sha, "reviewer@example.test", "5"]);
  assert.equal(withReviewer.reviewerEmail, "reviewer@example.test");
  assert.equal(withReviewer.limit, 5);
});

test("invalid staging arguments are refused", () => {
  for (const argv of [
    [],
    ["bundle.gz"],
    ["--apply", "bundle.gz", sha, "20"],
    ["bundle.gz", sha, "0"],
    ["bundle.gz", sha, "reviewer@example.test", "5", "extra"],
    ["bundle.gz", sha, "not-a-limit"],
  ])
    assert.throws(() => parseArguments(argv), /Usage/u);
});
