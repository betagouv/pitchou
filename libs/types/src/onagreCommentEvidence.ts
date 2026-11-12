// Facts from the exact prepared source and reference snapshot used for the review inventory.
export interface CommentEvidence {
  descriptionId: string;
  species: string | null;
  sourceTaxref: string | null;
  speciesResolved: boolean;
  method: string | null;
  activityText: string | null;
  descriptionText: string | null;
  precisionText: string | null;
  activities: {
    id: string;
    label: string;
    classification: string | null;
    impactType: string | null;
    candidates: { code: string; label: string }[];
  }[];
}

export interface CommentExplanation {
  species: string[];
  descriptionIds: string[];
  facts: string[];
  reasons: string[];
  decision: string;
}
