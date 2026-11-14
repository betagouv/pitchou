import type { CommentExplanation } from "./onagreCommentEvidence.ts";

export const commentCategories = {
  cmtactivitesespeces: "Textes libres des activités",
  unmapped_method: "Méthodes Onagre",
  unresolved_activity: "Activités non résolues",
  unresolved_species: "Espèces non résolues",
  cmtdescriptionsespeces: "Descriptions libres",
  precisionespeces: "Précisions libres",
} as const;
export type CommentCategory = keyof typeof commentCategories;
export const commentOutcomes = {
  pending: "À discuter",
  proposed: "Correspondance proposée",
  keep_comment: "Conserver en commentaire",
  needs_reference: "Référentiel à compléter",
} as const;
export type CommentOutcome = keyof typeof commentOutcomes;
export type CommentTarget = "impact_type" | "impact_methode" | "impact_moyen_de_poursuite";
export interface CommentExample {
  projectId: string;
  demandeKey: string;
  descriptionId: string;
  species: string | null;
  population: "new_import" | "linked_dn" | "blocked";
  activityText: string | null;
  descriptionText: string | null;
  precisionText: string | null;
}
export interface CommentGroup {
  id: string;
  review_hash: string;
  category: CommentCategory;
  value: string;
  project_count: number;
  demande_count: number;
  payload: {
    context: {
      activities?: string[];
      method?: string | null;
      classifications?: string[];
      impactTypes?: (string | null)[];
      sourceTaxref?: string | null;
      unresolvedActivityId?: string;
    };
    variants: string[];
    examples: CommentExample[];
    demandeKeys: string[];
    populations: Record<string, { projects: number; demandes: number }>;
  };
}
export interface CommentDemandePage {
  items: {
    key: string;
    label: string;
    dossiers: { id: number; name: string; url: string }[];
    explanations: CommentExplanation[];
  }[];
  total: number;
  page: number;
  pageSize: number;
}
export interface CommentDecisionInput {
  group_id: string;
  review_hash: string;
  version: number;
  outcome: CommentOutcome;
  target: CommentTarget | null;
  classification: string | null;
  code: string | null;
  reason: string;
}
export interface CommentDecision extends CommentDecisionInput {
  actor_id: number;
  updated_at: string;
}
export interface CommentChoice {
  target: CommentTarget;
  classification: string;
  code: string;
  label: string;
}
export interface CommentWorkspace {
  groups: (CommentGroup & { decision: CommentDecision | null })[];
  selected: (CommentGroup & { decision: CommentDecision | null }) | null;
  categories: { category: CommentCategory; count: number }[];
  total: number;
  page: number;
  pageSize: number;
  category: CommentCategory;
  search: string;
  outcome: string;
  choices: CommentChoice[];
}
