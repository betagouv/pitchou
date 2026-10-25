export type SourceReview = {
  filename: string;
  category: string;
  summary: string;
  previous: string;
  decision: string;
  reason: string;
  links: ({ label: string; tab: string } & Record<string, string>)[];
  storeOriginal: boolean;
};
export type OnagreDocument = {
  id: number;
  filename: string;
  fingerprint: string;
  size: string;
  mime: string;
  review: SourceReview;
  snapshot_id: number | null;
  created_at: string;
  has_original: boolean;
};
export type DocumentSheet = {
  document_id: number;
  sheet_index: number;
  name: string;
  row_count: number;
  columns: string[];
};
