import { describe, expect, it } from "vitest";
import type { CommentGroup, CommentCategory } from "@pitchou/types/onagreComments.ts";
import type { CommentEvidence } from "@pitchou/types/onagreCommentEvidence.ts";
import { explainOccurrences } from "./explanations.ts";

function group(category: CommentCategory): CommentGroup {
  return {
    id: "group",
    review_hash: "hash",
    category,
    value: "Capture",
    project_count: 1,
    demande_count: 1,
    payload: {
      context: { unresolvedActivityId: "a" },
      examples: [],
      variants: [],
      demandeKeys: ["demande"],
      populations: {},
    },
  };
}
function occurrence(overrides: Partial<CommentEvidence> = {}): CommentEvidence {
  return {
    descriptionId: "d1",
    species: "Bufo bufo",
    sourceTaxref: "259",
    speciesResolved: true,
    method: "Capture",
    activityText: null,
    descriptionText: null,
    precisionText: null,
    activities: [
      {
        id: "a",
        label: "Capture de spécimens",
        classification: "faune non-oiseau",
        impactType: null,
        candidates: [
          { code: "P-20", label: "Capture pour captivité temporaire ou définitive" },
          { code: "P-30", label: "Capture/relâcher immédiat" },
        ],
      },
    ],
    ...overrides,
  };
}

describe("per-demande review explanations", () => {
  it("explains competing impact types without selecting one", () => {
    const [result] = explainOccurrences(group("unresolved_activity"), [occurrence()]);
    expect(result.reasons[0]).toContain("plusieurs types");
    expect(result.reasons[0]).toContain("P-20");
    expect(result.reasons[0]).toContain("P-30");
    expect(result.decision).toContain("protocole");
  });
  it("distinguishes missing label mappings from multiple candidates", () => {
    const source = occurrence();
    source.activities[0].label = "Prélèvement de matériel biologique";
    source.activities[0].candidates = [];
    const [result] = explainOccurrences(group("unresolved_activity"), [source]);
    expect(result.reasons[0]).toContain("aucune correspondance de libellé");
    expect(result.reasons[0]).not.toContain("P-20");
    expect(result.reasons[0]).toContain("après interprétation");
  });
  it("isolates the selected activity from other activities on the same description", () => {
    const source = occurrence();
    source.activities.push({
      id: "b",
      label: "Transport",
      classification: "faune non-oiseau",
      impactType: "P-20",
      candidates: [],
    });
    const [result] = explainOccurrences(group("unresolved_activity"), [source]);
    expect(result.facts.join()).not.toContain("Transport");
    expect(result.reasons).toHaveLength(1);
  });
  it("does not propagate an explanation or free text to another description", () => {
    const result = explainOccurrences(group("cmtactivitesespeces"), [
      occurrence({ activityText: "capture à la main" }),
      occurrence({
        descriptionId: "d2",
        species: "Podarcis muralis",
        activityText: "capture au filet",
      }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].species).toEqual(["Bufo bufo"]);
    expect(result[0].facts.join()).not.toContain("filet");
    expect(result[1].facts.join()).not.toContain("main");
  });
  it("combines identical situations while retaining all species and description IDs", () => {
    const result = explainOccurrences(group("unmapped_method"), [
      occurrence(),
      occurrence({ descriptionId: "d2", species: "Podarcis muralis" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].descriptionIds).toEqual(["d1", "d2"]);
    expect(result[0].species).toEqual(["Bufo bufo", "Podarcis muralis"]);
  });
  it("explains the unresolved taxon without asserting absence from TAXREF", () => {
    const [result] = explainOccurrences(group("unresolved_species"), [
      occurrence({ speciesResolved: false, sourceTaxref: null }),
    ]);
    expect(result.facts[0]).toContain("non renseigné");
    expect(result.reasons[0]).toContain("Cela ne signifie pas");
    expect(result.decision).toContain("nom et l’identifiant");
  });
  it("makes unresolved species a prerequisite for method review", () => {
    const [result] = explainOccurrences(group("unmapped_method"), [
      occurrence({ speciesResolved: false }),
    ]);
    expect(result.reasons.join()).toContain("classification doit d’abord");
    expect(result.reasons.join()).not.toContain("P-20");
  });
  it("does not claim a resolved impact type is ambiguous when reviewing its method", () => {
    const source = occurrence();
    source.activities[0].impactType = "P-30";
    const [result] = explainOccurrences(group("unmapped_method"), [source]);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain("correspondance");
    expect(result.reasons[0]).not.toContain("plusieurs");
  });
  it("explains a missing activity rather than inventing candidates", () => {
    const [result] = explainOccurrences(group("unmapped_method"), [occurrence({ activities: [] })]);
    expect(result.reasons.join()).toContain("Aucune activité");
  });
  it("reports a single candidate as a preparation discrepancy, without applying it", () => {
    const source = occurrence();
    source.activities[0].candidates.pop();
    const [result] = explainOccurrences(group("unresolved_activity"), [source]);
    expect(result.reasons[0]).toContain("Vérifier la préparation");
    expect(result.reasons[0]).not.toContain("plusieurs types");
  });
  it.each([
    ["cmtactivitesespeces", "saisi librement", "champ structuré"],
    ["cmtdescriptionsespeces", "description libre", "description"],
    ["precisionespeces", "précision libre", "distinctions"],
  ] as const)("explains %s as review, not necessarily ambiguity", (category, reason, decision) => {
    const [result] = explainOccurrences(group(category), [
      occurrence({
        activityText: "capture manuelle à l’aide d’épuisette",
        precisionText: "adultes juvéniles et larves",
      }),
    ]);
    expect(result.reasons.join()).toContain(reason);
    expect(result.decision).toContain(decision);
    expect(result.facts.join()).toContain("adultes juvéniles et larves");
    expect(result.facts.join()).toContain("épuisette");
    expect(result.reasons.join()).not.toContain("plusieurs types");
  });
  it("returns no fabricated explanation for absent evidence", () => {
    expect(explainOccurrences(group("unmapped_method"), [])).toEqual([]);
  });
});
