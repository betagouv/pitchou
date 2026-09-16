import { expect, test } from "vitest";
import {
  defaultDossierTab,
  isDossierTabVisible,
  parseDossierTab,
  visibleDossierTabs,
} from "./dossierTabs.ts";

test("Instruction is first and default in both modes", () => {
  expect(defaultDossierTab).toBe("instruction");
  for (const readOnly of [false, true]) {
    expect(visibleDossierTabs(readOnly)[0].id).toBe(defaultDossierTab);
    expect(isDossierTabVisible(defaultDossierTab, readOnly)).toBe(true);
  }
});

test("explicit and shipped legacy tab links remain valid", () => {
  expect(parseDossierTab("avis")).toBe("avis");
  expect(parseDossierTab("#instruction")).toBe("instruction");
  expect(parseDossierTab("#projet")).toBe("detail-du-projet");
  expect(parseDossierTab("missing")).toBeUndefined();
  expect(isDossierTabVisible("historique", true)).toBe(false);
  expect(isDossierTabVisible("generation-document", true)).toBe(false);
});
