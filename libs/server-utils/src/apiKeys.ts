import { error } from "@sveltejs/kit";
import {
  apiKeyLifetimes,
  apiScopeLabels,
  type ApiKeyInput,
  type ApiScope,
} from "@pitchou/types/externalApi.ts";

export function apiKeyLabel(label: unknown): string {
  if (typeof label !== "string" || !label.trim() || label.trim().length > 80)
    error(400, "Saisissez un nom de 1 à 80 caractères.");
  return label.trim();
}

export function isApiScope(scope: unknown): scope is ApiScope {
  return typeof scope === "string" && Object.hasOwn(apiScopeLabels, scope);
}

export function parseApiKeyInput(body: Record<string, unknown>): ApiKeyInput {
  const { days, scopes } = body;
  const lifetime = apiKeyLifetimes.find((value) => value === days);
  if (!lifetime) error(400, "Choisissez une durée de validité proposée.");
  if (!Array.isArray(scopes) || scopes.length === 0 || !scopes.every(isApiScope))
    error(400, "Choisissez au moins une permission proposée.");
  return { label: apiKeyLabel(body.label), scopes: [...new Set(scopes)], days: lifetime };
}

export function apiKeyId(id: unknown): string {
  if (typeof id !== "string" || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu.test(id))
    error(400, "Identifiant de clé invalide.");
  return id;
}

export const apiKeyResponseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
