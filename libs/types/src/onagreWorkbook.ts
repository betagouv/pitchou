export type WorkbookSheet = {
  name: string;
  rows: { number: number; cells: (string | number | boolean)[] }[];
};
export type WorkbookContext = {
  sheet: string;
  row: number;
  proposal: string;
  confidence: string;
  comment: string;
  details: { label: string; value: string }[];
  sharedNotes: string[];
};
