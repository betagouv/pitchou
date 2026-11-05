export type OnagreImportAvailability = { enabled: boolean; reason: string | null };

export type OnagreImportPolicy = {
  version: string;
  title: string;
  description: string;
  omissions: string[];
};

export type OnagreImportRecord = {
  recordId: string;
  code: string | null;
  name: string | null;
  receptionDate: string | null;
  status: "ready" | "blocked" | "already_imported" | "conflict";
  issues: string[];
  omissions: string[];
  sourceHash: string | null;
  targetHash: string;
  dossierId: number | null;
  // Optional for reports saved by earlier profiles.
  plan?: OnagreImportPlan;
};

export type OnagreImportPlan = {
  columns: Partial<
    Record<
      | "main_activite"
      | "motif_derogation"
      | "description"
      | "no_other_satisfactory_solution_justification",
      string
    >
  >;
  fields: {
    target: string;
    value: string;
    sources: string[];
    mappings: { key: string; version: number }[];
  }[];
};

export type OnagreImportPreview = {
  previewId: string;
  createdAt: string;
  expiresAt: string;
  sourceInstance: string;
  snapshotId: number;
  snapshotFingerprint: string;
  policy: OnagreImportPolicy;
  mappingHash: string;
  inputHash: string;
  targetHash: string;
  availability: OnagreImportAvailability;
  records: OnagreImportRecord[];
};

export type OnagreImportOutcome = {
  recordId: string;
  status: "created" | "already_imported" | "blocked" | "conflict" | "omitted";
  dossierId: number | null;
  issues: string[];
  omissions: string[];
  plan?: OnagreImportPlan;
};

export type OnagreImportRun = {
  runId: string;
  createdAt: string;
  actorId: number;
  preview: OnagreImportPreview;
  recordIds: string[];
  outcomes: OnagreImportOutcome[];
};

export type OnagreImportPreviewRequest = {
  action: "preview";
  snapshotId: number;
  recordIds: string[];
};
export type OnagreImportApplyRequest = {
  action: "apply";
  previewId: string;
  recordIds: string[];
};
export type OnagreImportRequest = OnagreImportPreviewRequest | OnagreImportApplyRequest;

export type OnagreImportJobStatus =
  | "analyzing"
  | "review"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled";
export type OnagreImportCounts = Record<
  OnagreImportRecord["status"] | "created" | "omitted",
  number
>;
export type OnagreImportJob = {
  id: string;
  actorId: number;
  snapshotId: number;
  status: OnagreImportJobStatus;
  total: number;
  analyzed: number;
  processed: number;
  counts: OnagreImportCounts;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  policy: OnagreImportPolicy;
};
export type OnagreImportJobPage = {
  job: OnagreImportJob;
  records: (
    | OnagreImportRecord
    | (OnagreImportOutcome & { name: string | null; code: string | null })
  )[];
  page: number;
  pages: number;
};
