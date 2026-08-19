import { describe, expect, it } from "vitest";
import type { ActiviteReferentielAdmin } from "$lib/actions/adminActivites.ts";
import { groupLabelsByActivite, labelsToReview } from "./activitesModel.ts";

function label(
  value: string,
  activite_code: string,
  needs_review = false,
  created_at = "2026-08-19T10:00:00Z",
) {
  return { label: value, activite_code, needs_review, created_at };
}

const referentiel: ActiviteReferentielAdmin = {
  activites: [
    { code: "autre", label: "Autre" },
    { code: "carrieres", label: "Carrières" },
    { code: "gestion-eau", label: "Projets liés à la gestion de l’eau" },
    { code: "zac", label: "ZAC" },
  ],
  labels: [
    label("ZAC", "zac"),
    label("Carrières", "carrieres"),
    label("Carrières (ancien libellé)", "carrieres"),
    label("Autre", "autre"),
    label("Un libellé inconnu", "autre", true, "2026-08-19T09:00:00Z"),
    label("Autre libellé inconnu", "autre", true, "2026-08-18T09:00:00Z"),
  ],
};

describe("groupLabelsByActivite", () => {
  it("groups labels under their activity, sorted, with « Autre » pinned last", () => {
    const groups = groupLabelsByActivite(referentiel);

    expect(groups.map(({ activite }) => activite.code)).toEqual([
      "carrieres",
      "gestion-eau",
      "zac",
      "autre",
    ]);
    expect(groups[0].labels.map(({ label }) => label)).toEqual([
      "Carrières",
      "Carrières (ancien libellé)",
    ]);
  });

  it("keeps activities without any label, so new ones are visible", () => {
    const groups = groupLabelsByActivite(referentiel);
    const gestionEau = groups.find(({ activite }) => activite.code === "gestion-eau");
    expect(gestionEau?.labels).toEqual([]);
  });
});

describe("labelsToReview", () => {
  it("returns only flagged labels, oldest detection first", () => {
    expect(labelsToReview(referentiel).map(({ label }) => label)).toEqual([
      "Autre libellé inconnu",
      "Un libellé inconnu",
    ]);
  });
});
