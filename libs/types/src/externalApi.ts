export const dossierReadScope = "dossiers:read";
export const dossierInternalScope = "dossiers:read:internal";
export const accountReadScope = "account:read";
export const referenceReadScope = "references:read";
export const retiredStatusScope = "dossiers:read:statut";

export const dossierGrantScopeLabels = {
  [dossierReadScope]: "Consulter les dossiers",
  [dossierInternalScope]: "Consulter les informations internes des dossiers",
};
export const apiScopeLabels = {
  ...dossierGrantScopeLabels,
  [accountReadScope]: "Consulter mon compte, mes groupes et mes notifications",
  [referenceReadScope]: "Consulter les référentiels",
};
export type ApiScope = keyof typeof apiScopeLabels;
export type DossierGrantScope = keyof typeof dossierGrantScopeLabels;
export const personalDossierScopes = [dossierReadScope] as const;
export const personalAccountScopes = [accountReadScope, referenceReadScope] as const;
export const serviceScopes = [
  ...personalDossierScopes,
  dossierInternalScope,
  referenceReadScope,
] as const;

export function apiScopeLabel(scope: string) {
  if (scope === retiredStatusScope) return "Consulter le statut des dossiers (permission retirée)";
  return Object.hasOwn(apiScopeLabels, scope) ? apiScopeLabels[scope as ApiScope] : scope;
}

export const apiKeyLifetimes = [7, 30, 90] as const;
export type ApiKeyInput = {
  label: string;
  scopes: ApiScope[];
  days: (typeof apiKeyLifetimes)[number];
};

export type ApiKeySummary = {
  id: string;
  label: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export type ApiGrantTarget = { dossierId: number } | { groupeId: string };
export type ApiGrant = ApiGrantTarget & {
  scope: DossierGrantScope | typeof retiredStatusScope;
  label: string;
};
