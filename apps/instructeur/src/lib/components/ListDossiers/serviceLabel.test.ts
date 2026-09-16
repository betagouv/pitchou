import { expect, test } from "vitest";
import { serviceLabel } from "./serviceLabel.ts";

test("the counter describes territory rather than service ownership", () => {
  expect(serviceLabel("assigned")).toBe("dossiers dans vos territoires d'affectation");
  expect(serviceLabel("france")).toBe("dossiers en France entière (lecture seule)");
});

test("My dossiers keeps the followed-only wording in either scope", () => {
  expect(serviceLabel("assigned", true)).toBe("dossiers suivis dans vos territoires d'affectation");
  expect(serviceLabel("france", true)).toBe("dossiers suivis en France entière (lecture seule)");
});
