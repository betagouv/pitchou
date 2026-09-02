import { describe, expect, it } from "vitest";
import { activiteIconUrl } from "@pitchou/ui/activites/activiteIcon.ts";
import type { ActiviteReferentielAdmin } from "$lib/actions/adminActivites.ts";
import {
  activiteSelectEntries,
  groupeSections,
  groupeSelectOptions,
  labelsToReview,
} from "./activitesModel.ts";

function label(
  value: string,
  activite_code: string,
  needs_review = false,
  created_at = "2026-08-19T10:00:00Z",
) {
  return { label: value, activite_code, needs_review, created_at };
}

const referentiel: ActiviteReferentielAdmin = {
  groupes: [
    { code: "ecologie", label: "Écologie", color: "#d4f2c2" },
    { code: "autres-activites", label: "Autres activités", color: "#c8f4d4" },
    { code: "activite-economique", label: "Activité économique", color: "#f6e7e1" },
  ],
  activites: [
    { code: "evenementiel", label: "Événementiel", groupe_code: "autres-activites" },
    { code: "autre", label: "Autre", groupe_code: "autres-activites" },
    { code: "zac", label: "ZAC", groupe_code: "activite-economique" },
    { code: "carrieres", label: "Carrières", groupe_code: "activite-economique" },
    { code: "gestion-eau", label: "Projets liés à la gestion de l’eau", groupe_code: "ecologie" },
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

describe("groupeSections", () => {
  it("orders groups and activities alphabetically", () => {
    const sections = groupeSections(referentiel);

    expect(sections.map(({ groupe }) => groupe.code)).toEqual([
      "activite-economique",
      "autres-activites",
      "ecologie",
    ]);
    expect(sections[0].activites.map(({ activite }) => activite.code)).toEqual([
      "carrieres",
      "zac",
    ]);
    expect(sections[1].activites.map(({ activite }) => activite.code)).toEqual([
      "autre",
      "evenementiel",
    ]);
  });

  it("groups labels under their activity, sorted, and keeps label-less activities", () => {
    const sections = groupeSections(referentiel);

    const carrieres = sections[0].activites.find(({ activite }) => activite.code === "carrieres");
    expect(carrieres?.labels.map(({ label }) => label)).toEqual([
      "Carrières",
      "Carrières (ancien libellé)",
    ]);

    const gestionEau = sections[2].activites.find(
      ({ activite }) => activite.code === "gestion-eau",
    );
    expect(gestionEau?.labels).toEqual([]);
  });
});

describe("groupeSelectOptions", () => {
  it("builds alphabetical options carrying the group color as a swatch", () => {
    expect(groupeSelectOptions(referentiel.groupes)).toEqual([
      { value: "activite-economique", label: "Activité économique", color: "#f6e7e1" },
      { value: "autres-activites", label: "Autres activités", color: "#c8f4d4" },
      { value: "ecologie", label: "Écologie", color: "#d4f2c2" },
    ]);
  });
});

describe("activiteSelectEntries", () => {
  it("groups activities under colored group headers, with their icon on the group color", () => {
    const entries = activiteSelectEntries(referentiel);

    expect(entries.map((entry) => ("label" in entry ? entry.label : null))).toEqual([
      "Activité économique",
      "Autres activités",
      "Écologie",
    ]);
    expect(entries[0]).toEqual({
      label: "Activité économique",
      color: "#f6e7e1",
      options: [
        {
          value: "carrieres",
          label: "Carrières",
          icon: activiteIconUrl("carrieres"),
          color: "#f6e7e1",
        },
        { value: "zac", label: "ZAC", icon: activiteIconUrl("zac"), color: "#f6e7e1" },
      ],
    });
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
