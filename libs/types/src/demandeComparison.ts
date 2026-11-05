/** A presentation of domain data, built only after applying the reader's access rules. */
export type ComparisonValue =
  | null
  | string
  | number
  | boolean
  | ComparisonValue[]
  | { [key: string]: ComparisonValue };

export type ComparisonField = {
  key: string;
  label: string;
  value: ComparisonValue;
  /** Stable file identity, distinct from its display name. Never rendered as dossier content. */
  revisionKey?: string;
};

export type ComparisonRecord = {
  /** Semantic key, shared by equivalent records in separate demandes. */
  key: string;
  /** Scoped database identity, used only for matching records within the same demande. */
  identity?: string;
  label: string;
  fields: ComparisonField[];
  sections?: ComparisonSection[];
};

export type ComparisonSection = {
  key: string;
  label: string;
  records: ComparisonRecord[];
};

export type DemandeComparisonDocument = {
  sections: ComparisonSection[];
};

export type DemandeDifference = {
  path: string[];
  kind: "added" | "removed" | "changed";
  left: ComparisonValue;
  right: ComparisonValue;
  detail?: string;
};
