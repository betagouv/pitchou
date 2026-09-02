import { describe, expect, test } from "vitest";

import {
  findActiviteLabelConflict,
  withResolvedActivite,
  type ActiviteReferentiel,
} from "./activite.ts";

const referentiel = {
  groupes: [{ code: "extraction", label: "Extraction", color: "#eeeeee" }],
  activites: [
    { code: "carrieres", label: "Carrières", groupe_code: "extraction" },
    { code: "autre", label: "Autre", groupe_code: "extraction" },
  ],
  labels: [
    { label: "Carrières", activite_code: "carrieres", needs_review: false },
    { label: "Anciennes carrières", activite_code: "carrieres", needs_review: false },
    { label: "Travaux", activite_code: "autre", needs_review: true },
  ],
} as ActiviteReferentiel;

describe("findActiviteLabelConflict", () => {
  test("rejects the display name of another activity", () => {
    expect(findActiviteLabelConflict(referentiel, "zac", "Carrières")).toBe(true);
  });

  test("rejects a reviewed label grouped under another activity", () => {
    expect(findActiviteLabelConflict(referentiel, "zac", "Anciennes carrières")).toBe(true);
  });

  test("accepts a label parked pending review (it gets adopted)", () => {
    expect(findActiviteLabelConflict(referentiel, "travaux", "Travaux")).toBe(false);
  });

  test("accepts an activity's own current or former labels", () => {
    expect(findActiviteLabelConflict(referentiel, "carrieres", "Carrières")).toBe(false);
    expect(findActiviteLabelConflict(referentiel, "carrieres", "Anciennes carrières")).toBe(false);
  });

  test("accepts a name unknown to the referentiel", () => {
    expect(findActiviteLabelConflict(referentiel, "zac", "ZAC")).toBe(false);
  });
});

describe("withResolvedActivite", () => {
  test("keeps the activity resolved by the query joins", () => {
    const row = withResolvedActivite({
      main_activite: "Anciennes carrières",
      activite_code: "carrieres",
      activite_label: "Carrières",
    });
    expect(row).toMatchObject({ activite_code: "carrieres", activite_label: "Carrières" });
  });

  test("parks an unclassified label under « autre » but keeps its raw display", () => {
    const row = withResolvedActivite({
      main_activite: "Travaux",
      activite_code: null,
      activite_label: null,
    });
    expect(row).toMatchObject({ activite_code: "autre", activite_label: "Travaux" });
  });

  test("leaves a dossier without activity untouched", () => {
    const row = withResolvedActivite({
      main_activite: null,
      activite_code: null,
      activite_label: null,
    });
    expect(row).toMatchObject({ activite_code: null, activite_label: null });
  });
});
