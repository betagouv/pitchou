import { error } from "@sveltejs/kit";
import { listDossiersDeposesDuringYear } from "@pitchou/server/database/dossier_admin_list.ts";
import type { RequestHandler } from "./$types";
import { dossiersExportToCSV } from "./format.ts";

function parseYear(value: string | null): number {
  if (!value) return new Date().getFullYear();
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2200)
    error(400, `Année invalide : '${value}'.`);
  return year;
}

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async ({ url }) => {
  const year = parseYear(url.searchParams.get("year"));
  const rows = await listDossiersDeposesDuringYear(year);

  // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
  return new Response(`﻿${dossiersExportToCSV(rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dossiers_${year}.csv"`,
    },
  });
};
