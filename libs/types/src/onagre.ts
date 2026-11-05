import type { WorkbookContext } from "./onagreWorkbook.ts";

export type SourceRow = Record<string, string | null>;
export type OnagreForeignKey = {
  name: string;
  columns: string[];
  targetTable: string;
  targetColumns: string[];
};
export type OnagreConstraints = { primaryKey: string[]; foreignKeys: OnagreForeignKey[] };
export type OnagreFieldRelations = {
  primaryKey: string[];
  outgoing: OnagreForeignKey[];
  incoming: (OnagreForeignKey & { sourceTable: string })[];
};
export type OnagreTable = {
  name: string;
  columns: string[];
  count: number;
  samples: SourceRow[];
  constraints?: OnagreConstraints;
};
export type MappingSeed = {
  key: string;
  section: string;
  label: string;
  context: string;
  proposal: string;
  confidence: string;
  notes: string;
};
export type MappingStatus = "todo" | "review" | "discuss" | "validated" | "excluded";
export type OnagreSharedRule = {
  key: string;
  title: string;
  rule: string;
  notes: string;
  status: "review" | "discuss" | "validated";
  version: number;
  updated_at: string | null;
};
export type OnagreMapping = MappingSeed & {
  originalWorkbook?: WorkbookContext;
  relations?: OnagreFieldRelations;
  status: MappingStatus;
  activity_code?: string | null;
  target: string;
  rule: string;
  version: number;
  updated_at: string | null;
};
export type OnagreBundle = {
  format: "pitchou-onagre-v1";
  fingerprint: string;
  workbookFingerprint: string;
  filename: string;
  tables: OnagreTable[];
  mappings: MappingSeed[];
  demandes: SourceRow[];
  projets: SourceRow[];
};
