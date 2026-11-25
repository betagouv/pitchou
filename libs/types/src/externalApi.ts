export const dossierStatusScope = "dossiers:read:statut";
export const apiScopeLabels = { [dossierStatusScope]: "Consulter le statut des dossiers" };
export type ApiScope = keyof typeof apiScopeLabels;

export const apiKeyLifetimes = [7, 30, 90] as const;
export type ApiKeyInput = {
  label: string;
  scopes: ApiScope[];
  days: (typeof apiKeyLifetimes)[number];
};

export type ApiKeySummary = {
  id: string;
  label: string;
  scopes: ApiScope[];
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export type ApiGrantTarget = { dossierId: number } | { groupeId: string };
export type ApiGrant = ApiGrantTarget & { scope: ApiScope; label: string };
