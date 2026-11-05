import type { DossierSummary } from "./API_Pitchou.ts";
import type { DossierNotification } from "./notification.ts";

export type DossiersListScope = "all" | "followed";

/** Only the current page crosses the list endpoint; totals count grouped dossiers. */
export type DossiersListPage = {
  items: DossierSummary[];
  total: number;
  totalDemandes: number;
  scopeTotal: number;
  page: number;
  pageSize: number;
  followRelations: [string, DossierSummary["id"][]][];
  notifications: DossierNotification[];
};

/** Filter choices cover the authorised scope, independently of the visible page. */
export type DossiersListOptions = {
  activites: { code: string; label: string }[];
  assignedDepartments: string[];
  instructeurs: string[];
};
