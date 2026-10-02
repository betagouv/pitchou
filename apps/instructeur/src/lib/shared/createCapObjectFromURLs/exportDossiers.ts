import type { PitchouInstructeurCapabilities } from "@pitchou/types/capabilities.ts";
import { RequestError } from "./requestWrappers.ts";

export function wrapExportDossiers(
  url: string | undefined,
): PitchouInstructeurCapabilities["exporterDossiers"] | undefined {
  if (!url) return undefined;
  return async (scope, format, dossierIds) => {
    const exportUrl = new URL(url, globalThis.location.href);
    exportUrl.searchParams.set("scope", scope);
    exportUrl.searchParams.set("format", format);
    const response = await fetch(exportUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossierIds }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      throw new RequestError(response.status, body?.message ?? "L'export des dossiers a échoué.");
    }
    return response.blob();
  };
}
