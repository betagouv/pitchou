import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth.ts";
import { getDossiersForExport } from "@pitchou/server/database/dossier/export.ts";
import { dossiersExportTable } from "@pitchou/common/dossiersExport.ts";
import { tableToCsv, tableToOds } from "@pitchou/common/spreadsheet.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const scope = url.searchParams.get("scope");
  const format = url.searchParams.get("format");
  if (scope !== "service" && scope !== "followed" && scope !== "france")
    error(400, "Périmètre d'export invalide.");
  if (format !== "csv" && format !== "ods") error(400, "Format d'export invalide.");
  const bodyParameters = await readJsonObject(request);
  rejectUnknownProperties(bodyParameters, new Set(["dossierIds"]));
  const selectedIds = bodyParameters.dossierIds;
  if (
    !Array.isArray(selectedIds) ||
    !selectedIds.every((id) => Number.isInteger(id) && id > 0 && id <= 2147483647)
  ) {
    error(400, "Liste de dossiers invalide.");
  }
  const dossiers = await getDossiersForExport(cap, scope, selectedIds as DossierId[]);
  if (!dossiers) error(403, "Capability non valide.");
  const table = dossiersExportTable(dossiers);
  const body = format === "csv" ? tableToCsv(table) : tableToOds(table);
  const prefix =
    scope === "followed"
      ? "mes-dossiers"
      : scope === "france"
        ? "tous-les-dossiers"
        : "dossiers-service";
  return new Response(body, {
    headers: {
      "Content-Type":
        format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.oasis.opendocument.spreadsheet",
      "Content-Disposition": `attachment; filename="${prefix}-${new Date().toISOString().slice(0, 10)}.${format}"`,
      "Cache-Control": "private, no-store",
    },
  });
};
