import {
  listAvisExpertForExport,
  listDossiersForExport,
} from "@pitchou/server/database/dossier_admin_list.ts";
import type { RequestHandler } from "./$types";
import { dossiersExportToWorkbook } from "./workbook.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  const [dossiers, avisExpert] = await Promise.all([
    listDossiersForExport(),
    listAvisExpertForExport(),
  ]);

  return new Response(dossiersExportToWorkbook(dossiers, avisExpert), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="dossiers.xlsx"',
    },
  });
};
