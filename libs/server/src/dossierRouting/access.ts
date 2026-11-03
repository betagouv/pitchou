import { BUNDLES, type Permission } from "@pitchou/types/permissions.ts";
import { sharedDossierIdsSql } from "./projet.ts";

// Expressions are internal aliases. Bind all user-supplied values in the caller's query.
export function permissionSql(user: string, permission: Permission) {
  const bundles = Object.entries(BUNDLES)
    .filter(([, permissions]) => (permissions as readonly string[]).includes(permission))
    .map(([bundle]) => `'${bundle}'`);
  return `(EXISTS (SELECT 1 FROM auth_user account WHERE account.id = ${user} AND account.active)
    AND NOT EXISTS (SELECT 1 FROM auth_permission_exclusion denied
      WHERE denied.user_id = ${user} AND denied.permission = '${permission}')
    AND (EXISTS (SELECT 1 FROM auth_permission granted
      WHERE granted.user_id = ${user} AND granted.permission = '${permission}')
      OR EXISTS (SELECT 1 FROM auth_permission_bundle bundle
        WHERE bundle.user_id = ${user} AND bundle.bundle IN (${bundles.join(", ")}))))`;
}

export function dossierAccessSql(dossier: string, user: string) {
  return `(WITH grants AS (
    SELECT e.access_level FROM edge_groupe_instructeurs__dossier e
    JOIN user_groupe m ON m.groupe_instructeurs = e.groupe_instructeurs
    JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
    WHERE e.dossier IN (${sharedDossierIdsSql(dossier)}) AND m.user_id = ${user}
    UNION ALL SELECT routing_direct_grant.access_level FROM dossier_user_access routing_direct_grant
      WHERE routing_direct_grant.dossier IN (${sharedDossierIdsSql(dossier)}) AND routing_direct_grant.user_id = ${user}
  ) SELECT CASE WHEN NOT ${permissionSql(user, "dossier:read")}
      OR NOT EXISTS (SELECT 1 FROM dossier existing WHERE existing.id = ${dossier}) THEN NULL
    WHEN EXISTS (SELECT 1 FROM grants WHERE access_level = 'instruct')
      AND ${permissionSql(user, "dossier:instruct")} THEN 'complet'
    WHEN EXISTS (SELECT 1 FROM grants) THEN 'lecture_complete'
    WHEN EXISTS (SELECT 1 FROM user_groupe membership JOIN groupe_instructeurs active_group
      ON active_group.id = membership.groupe_instructeurs AND active_group.active
      WHERE membership.user_id = ${user}) THEN 'lecture'
    ELSE NULL END)`;
}
