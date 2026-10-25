import type { OnagreMapping } from "@pitchou/types/onagre.ts";

export type ReviewEntry = {
  key: string;
  origin: "workbook" | "schema-inference";
  evidence: string;
  expected: Pick<
    OnagreMapping,
    | "version"
    | "proposal"
    | "confidence"
    | "context"
    | "status"
    | "target"
    | "rule"
    | "notes"
    | "activity_code"
  >;
  decision: Pick<OnagreMapping, "target" | "rule" | "notes"> & {
    status: "review" | "discuss" | "validated" | "excluded";
    activity_code?: string;
  };
};

export type DecisionReview = {
  format: "pitchou-onagre-decision-review-v1";
  snapshotFingerprint: string;
  workbookFingerprint: string;
  authorization: string;
  entries: ReviewEntry[];
};
