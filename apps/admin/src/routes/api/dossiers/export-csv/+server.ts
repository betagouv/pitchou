import { listDossiersForExport } from "@pitchou/server/database/dossier_admin_list.ts";
import type { RequestHandler } from "./$types";
import { dossiersExportToCSV } from "./format.ts";

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  const rows = await listDossiersForExport();

  // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
  return new Response(`\ufeff${dossiersExportToCSV(rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="dossiers.csv"',
    },
  });
};
