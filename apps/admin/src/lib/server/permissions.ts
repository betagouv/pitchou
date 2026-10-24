import type { Permission } from "@pitchou/types/permissions.ts";

// Every write route must opt into a permission. Unlisted writes are denied.
const writeRules: { method: string; path: RegExp; anyOf: Permission[] }[] = [
  { method: "POST", path: /^\/onagre$/u, anyOf: ["admin:onagre:manage"] },
  { method: "POST", path: /^\/api\/dossiers(?:\/minimal)?$/u, anyOf: ["admin:dossiers:create"] },
  { method: "PUT", path: /^\/api\/dossiers\/[^/]+$/u, anyOf: ["admin:dossiers:update"] },
  { method: "DELETE", path: /^\/api\/dossiers\/[^/]+$/u, anyOf: ["admin:dossiers:delete"] },
  {
    method: "POST",
    path: /^\/api\/dossiers\/[^/]+\/pieces-jointes$/u,
    anyOf: ["admin:dossiers:files"],
  },
  {
    method: "DELETE",
    path: /^\/api\/dossiers\/[^/]+\/pieces-jointes\/[^/]+$/u,
    anyOf: ["admin:dossiers:files"],
  },
  {
    method: "POST",
    path: /^\/api\/dossiers\/[^/]+\/especes-impactees$/u,
    anyOf: ["admin:dossiers:species"],
  },
  {
    method: "DELETE",
    path: /^\/api\/dossiers\/[^/]+\/especes-impactees$/u,
    anyOf: ["admin:dossiers:species"],
  },
  {
    method: "POST",
    path: /^\/api\/dossiers\/[^/]+\/simuler-synchronisation$/u,
    anyOf: ["admin:sync:simulate"],
  },
  { method: "POST", path: /^\/api\/activites$/u, anyOf: ["admin:activites:manage"] },
  {
    method: "PUT",
    path: /^\/api\/activites\/(?:[^/]+|groupes\/[^/]+)$/u,
    anyOf: ["admin:activites:manage"],
  },
  {
    method: "PUT",
    path: /^\/api\/especes-protegees\/modifications\/[^/]+$/u,
    anyOf: ["admin:especes:manage"],
  },
  {
    method: "DELETE",
    path: /^\/api\/especes-protegees\/modifications\/[^/]+$/u,
    anyOf: ["admin:especes:manage"],
  },
  { method: "POST", path: /^\/api\/changelog$/u, anyOf: ["admin:changelog:create"] },
  { method: "PUT", path: /^\/api\/changelog\/[^/]+$/u, anyOf: ["admin:changelog:update"] },
  { method: "DELETE", path: /^\/api\/changelog\/[^/]+$/u, anyOf: ["admin:changelog:delete"] },
  { method: "POST", path: /^\/api\/changelog\/[^/]+\/media$/u, anyOf: ["admin:changelog:update"] },
  {
    method: "DELETE",
    path: /^\/api\/changelog\/[^/]+\/media$/u,
    anyOf: ["admin:changelog:update"],
  },
  { method: "POST", path: /^\/api\/synchronisation-dn$/u, anyOf: ["admin:sync:run"] },
  // Uploading bytes grants no right to attach them. Each attachment route also checks access.
  {
    method: "POST",
    path: /^\/api\/fichiers\/upload-url$/u,
    anyOf: [
      "admin:dossiers:create",
      "admin:dossiers:files",
      "admin:dossiers:species",
      "admin:changelog:update",
    ],
  },
];

export function canAccessAdminRoute(
  routeId: string | null,
  method: string,
  permissions: readonly Permission[],
): boolean {
  if (!permissions.includes("admin:access")) return false;
  // SvelteKit resolves encoded URLs and data requests to the same route ID.
  // Unmatched reads reach SvelteKit's 404; unmatched writes remain denied.
  const path = routeId ?? "";
  if (path === "/dossiers/nouveau") return permissions.includes("admin:dossiers:create");
  if (path === "/changelog/nouveau") return permissions.includes("admin:changelog:create");
  if (/^\/(?:api\/users|utilisateurs)(?:\/|$)/u.test(path))
    return permissions.includes("users:manage");
  if (
    /^\/groupes-instructeurs(?:\/|$)/u.test(path) ||
    (path === "/api/groupes-instructeurs" && method !== "GET")
  )
    return permissions.includes("groups:manage");
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  return writeRules.some(
    (rule) =>
      rule.method === method &&
      rule.path.test(path) &&
      rule.anyOf.some((permission) => permissions.includes(permission)),
  );
}
