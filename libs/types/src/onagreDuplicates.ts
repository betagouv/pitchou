import type { ReviewedLocationCorrection } from "./onagreLocations.ts";

export const duplicateDecisionLabels = {
  pending: "À examiner",
  ignore: "Ne pas importer cette demande",
  import_new: "Importer comme nouvelle demande",
} as const;
export type DuplicateOutcome = keyof typeof duplicateDecisionLabels;

export type DuplicateFacts = {
  reference: string;
  deposit: string | null;
  signatures: string[];
  departments: string[];
  communes: string[];
  locationCorrection?: ReviewedLocationCorrection;
};
export type DuplicateDemande = DuplicateFacts & {
  key: string;
  id: string;
  linkedDossierId: number | null;
  linkReason: string;
  question: string;
};
export type DuplicateCandidate = DuplicateFacts & {
  id: number;
  name: string;
  relationship: string;
};
export type DuplicateProject = {
  projectId: string;
  name: string;
  sourceHash: string;
  reason: string;
  question: string;
  demandes: DuplicateDemande[];
  candidates: DuplicateCandidate[];
  omittedDemandeIds: string[];
};
export type DuplicateReview = {
  project_id: string;
  review_hash: string;
  payload: DuplicateProject;
};
export type DuplicateDecision = {
  demande_key: string;
  project_id: string;
  review_hash: string;
  outcome: DuplicateOutcome;
  reason: string;
  version: number;
  actor_id: number;
  updated_at: Date | string;
};
export type DuplicateDecisionInput = Pick<
  DuplicateDecision,
  "demande_key" | "project_id" | "review_hash" | "outcome" | "reason" | "version"
>;
export type DuplicateRevision = {
  id: number;
  demande_key: string;
  actor_id: number;
  before: DuplicateDecision | null;
  after: DuplicateDecision;
  created_at: Date | string;
};
export type DuplicateWorkspace = {
  projects: DuplicateReview[];
  decisions: DuplicateDecision[];
  revisions: DuplicateRevision[];
};
