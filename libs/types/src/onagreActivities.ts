export type ActivityOption = { code: string; label: string; groupe_code: string };
export type ActivityWorksheetRow = {
  rowNumber: number;
  tracking: string;
  source: string;
  proposal: string;
  note: string;
  mappingKeys: string[];
};
export type OnagreActivities = {
  activities: ActivityOption[];
  rows: ActivityWorksheetRow[];
  generalNote: string;
  documentId: number | null;
};
