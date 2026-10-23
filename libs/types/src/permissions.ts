export const PERMISSIONS = {
  "dossier:read": "Consulter les dossiers",
  "dossier:instruct": "Instruire les dossiers de ses groupes",
  "admin:access": "Accéder à l'administration",
  "admin:dossiers:create": "Créer des dossiers",
  "admin:dossiers:update": "Modifier les dossiers",
  "admin:dossiers:delete": "Supprimer des dossiers",
  "admin:dossiers:files": "Gérer les pièces jointes des dossiers",
  "admin:dossiers:species": "Gérer les espèces impactées des dossiers",
  "admin:activites:manage": "Modifier les activités et leurs catégories",
  "admin:especes:manage": "Corriger le référentiel des espèces protégées",
  "admin:changelog:create": "Créer des entrées de changelog",
  "admin:changelog:update": "Modifier les entrées de changelog et leurs médias",
  "admin:changelog:delete": "Supprimer des entrées de changelog",
  "admin:sync:run": "Lancer une synchronisation DN",
  "admin:sync:simulate": "Simuler des changements DN sur les dossiers",
  "users:manage": "Gérer les utilisateurs et leurs droits",
  "groups:manage": "Gérer les groupes et leurs départements",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_GROUPS = [
  { label: "Instruction", permissions: ["dossier:read", "dossier:instruct"] },
  {
    label: "Administration : accès et comptes",
    permissions: ["admin:access", "users:manage", "groups:manage"],
  },
  {
    label: "Administration : dossiers",
    permissions: [
      "admin:dossiers:create",
      "admin:dossiers:update",
      "admin:dossiers:delete",
      "admin:dossiers:files",
      "admin:dossiers:species",
    ],
  },
  {
    label: "Administration : référentiels",
    permissions: ["admin:activites:manage", "admin:especes:manage"],
  },
  {
    label: "Administration : changelog",
    permissions: ["admin:changelog:create", "admin:changelog:update", "admin:changelog:delete"],
  },
  {
    label: "Administration : synchronisation",
    permissions: ["admin:sync:run", "admin:sync:simulate"],
  },
] satisfies { label: string; permissions: Permission[] }[];
export const BUNDLES = {
  instructeur: ["dossier:read", "dossier:instruct"],
  administrateur: Object.keys(PERMISSIONS) as Permission[],
} satisfies Record<string, Permission[]>;
export type PermissionBundle = keyof typeof BUNDLES;

export function effectivePermissions(
  bundles: readonly string[],
  grants: readonly string[],
  exclusions: readonly string[],
): Permission[] {
  const permissions = new Set<Permission>();
  for (const bundle of bundles) {
    if (Object.hasOwn(BUNDLES, bundle)) {
      for (const permission of BUNDLES[bundle as PermissionBundle]) permissions.add(permission);
    }
  }
  for (const grant of grants) {
    if (Object.hasOwn(PERMISSIONS, grant)) permissions.add(grant as Permission);
  }
  for (const exclusion of exclusions) permissions.delete(exclusion as Permission);
  return [...permissions];
}

export type UserId = import("./database/public/AuthUser.ts").AuthUserId;
export type AuthUser = {
  id: UserId;
  email: string | null;
  first_names: string | null;
  last_name: string | null;
  active: boolean;
  first_login_at: Date | null;
  last_login_at: Date | null;
};
export type SessionUser = AuthUser & {
  email: string;
  name: string;
  permissions: Permission[];
  groupes: { id: string; name: string }[];
};
