import { expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { followersLabel } from "./labels.ts";
import { activityBackground } from "./activityBackground.ts";

test("a single follower uses the whole email local part", () => {
  expect(followersLabel([])).toBe("Suivi par 0 personne");
  expect(followersLabel(["a.very.long.instructeur.name@example.com"])).toBe(
    "Suivi par a.very.long.instructeur.name",
  );
  expect(followersLabel(["a@test.fr", "b@test.fr"])).toBe("Suivi par 2 personnes");
});

test("every rectangular background matches the existing activity SVG circle", () => {
  const directory = new URL("../../../../../../static/icons/activites/", import.meta.url);
  for (const name of readdirSync(directory).filter((name) => name.endsWith(".svg"))) {
    const svg = readFileSync(new URL(name, directory), "utf8");
    const fill = svg.match(/<circle cx="316" cy="316" r="316" fill="([^"]+)"/)?.[1];
    expect(activityBackground(`/icons/activites/${name}`), name).toBe(fill);
  }
});
