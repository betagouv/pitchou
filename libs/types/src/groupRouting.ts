export type GroupRule = {
  departments: string[];
  communes: string[];
  activites: string[];
};

export type AssignmentMode = "auto" | "include" | "exclude";

export type GroupAssignment = {
  id: string;
  name: string;
  active: boolean;
  assigned: boolean;
  automatic: boolean;
  mode: AssignmentMode;
  departments: string[];
  rules: GroupRule[];
};

export type GroupPreview = {
  token: string;
  added: { count: number; dossiers: { id: number; name: string | null }[] };
  removed: { count: number; dossiers: { id: number; name: string | null }[] };
};
