import { expect, test } from "vitest";
import { classificationIconUrl } from "@pitchou/ui/especes/classificationIcon.ts";
import fauneIcon from "@pitchou/ui/especes/icons/classification/faune-non-oiseau.svg?url";

test("each classification has its own pictogram", () => {
  const urls = (["oiseau", "faune non-oiseau", "flore"] as const).map(classificationIconUrl);
  expect(urls.every(Boolean)).toBe(true);
  expect(new Set(urls).size).toBe(3);
  expect(classificationIconUrl("faune non-oiseau")).toBe(fauneIcon);
});
