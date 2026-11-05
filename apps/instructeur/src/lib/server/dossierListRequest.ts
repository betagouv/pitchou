import { error } from "@sveltejs/kit";
import type { DossiersListScope } from "@pitchou/types/dossierList.ts";

export function dossierListScope(params: URLSearchParams): DossiersListScope {
  const scope = params.get("scope") ?? "all";
  if (scope !== "all" && scope !== "followed") error(400, "Périmètre de liste invalide.");
  return scope;
}
