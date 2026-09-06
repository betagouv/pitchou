import { expect, test } from "vitest";
import { activiteIconUrl } from "./activiteIcon.ts";
import alluvialQuarryIcon from "./icons/carrieres-alluvionnaires.svg?url";

test("alluvial quarries have a dedicated icon", () => {
  expect(activiteIconUrl("carrieres-alluvionnaires")).toBe(alluvialQuarryIcon);
  expect(activiteIconUrl("carrieres-alluvionnaires")).not.toBe(activiteIconUrl("carrieres"));
});

test.each([null, undefined, "unknown-activity"])("%s uses the fallback icon", (code) => {
  expect(activiteIconUrl(code)).toBe(activiteIconUrl("autre"));
});
