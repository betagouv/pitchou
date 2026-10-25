import type { MappingStatus, SourceRow } from "./onagre.ts";
export type OnagreGroup = {
  id: string;
  name: string;
  active: boolean;
  coverage_needs_review: boolean;
  departments: string[];
  source: string;
  refreshed_at: string;
};
export type OnagreServiceMapping = {
  source_instance: string;
  service_id: number;
  snapshot_id: number;
  source: SourceRow;
  source_hash: string;
  group_ids: string[];
  status: MappingStatus;
  notes: string;
  version: number;
  updated_at: string;
};
export type OnagreService = {
  id: number;
  name: string;
  region: string;
  endDate: string | null;
  hidden: boolean;
  source: SourceRow;
  sourceHash: string;
  mapping: OnagreServiceMapping | null;
  needsReview: boolean;
  absent: boolean;
};
export type OnagreServices = {
  services: OnagreService[];
  groups: OnagreGroup[];
  catalogHash: string;
};
export type ServiceDecision = {
  snapshotId: number;
  serviceId: number;
  version: number;
  sourceHash: string;
  catalogHash: string;
  groupIds: string[];
  status: MappingStatus;
  notes: string;
};
