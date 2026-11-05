import type { PitchouInstructeurCapabilities } from "@pitchou/types/capabilities.ts";
import { RequestError } from "./requestWrappers.ts";

export function wrapExportDossiers(
  url: string | undefined,
): PitchouInstructeurCapabilities["exporterDossiers"] | undefined {
  if (!url) return undefined;
  return async (scope, format, dossierIds, query) => {
    const exportUrl = new URL(url, globalThis.location.href);
    exportUrl.searchParams.set("scope", scope);
    exportUrl.searchParams.set("format", format);
    if (query !== undefined) {
      const params = new URLSearchParams(query);
      if (params.has("from") || params.has("to")) {
        params.set("timeZone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      query = params.toString();
    }
    const response = await fetch(exportUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossierIds, query }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => {});
      throw new RequestError(response.status, body?.message ?? "L'export des dossiers a échoué.");
    }
    return response.blob();
  };
}
