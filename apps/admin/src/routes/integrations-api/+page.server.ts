import { listApiIntegrations } from "@pitchou/server/database/externalApi/integrations.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ setHeaders }) => {
  setHeaders({ "Cache-Control": "no-store" });
  return listApiIntegrations();
};
