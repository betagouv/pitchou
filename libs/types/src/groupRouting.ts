export type AccessLevel = "read" | "instruct";

export type GroupRule = {
  accessLevel?: AccessLevel;
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
  accessLevel: AccessLevel | null;
  manualAccessLevel: AccessLevel;
  departments: string[];
  rules: GroupRule[];
};

export type GroupPreview = {
  token: string;
  added: { count: number; dossiers: { id: number; name: string | null }[] };
  removed: { count: number; dossiers: { id: number; name: string | null }[] };
  upgraded: { count: number; dossiers: { id: number; name: string | null }[] };
  downgraded: { count: number; dossiers: { id: number; name: string | null }[] };
};
