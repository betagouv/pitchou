import { describe, expect, it } from "vitest";
import { BUNDLES, type Permission } from "@pitchou/types/permissions.ts";
import { canAccessAdminRoute } from "./permissions.ts";

const cases: [string, string, Permission][] = [
  ["POST", "/api/dossiers", "admin:dossiers:create"],
  ["POST", "/api/dossiers/minimal", "admin:dossiers:create"],
  ["PUT", "/api/dossiers/[dossierId]", "admin:dossiers:update"],
  ["DELETE", "/api/dossiers/[dossierId]", "admin:dossiers:delete"],
  ["POST", "/api/dossiers/[dossierId]/pieces-jointes", "admin:dossiers:files"],
  ["DELETE", "/api/dossiers/[dossierId]/pieces-jointes/[fichierId]", "admin:dossiers:files"],
  ["POST", "/api/dossiers/[dossierId]/especes-impactees", "admin:dossiers:species"],
  ["DELETE", "/api/dossiers/[dossierId]/especes-impactees", "admin:dossiers:species"],
  ["POST", "/api/dossiers/[dossierId]/simuler-synchronisation", "admin:sync:simulate"],
  ["POST", "/api/activites", "admin:activites:manage"],
  ["PUT", "/api/activites/[code]", "admin:activites:manage"],
  ["PUT", "/api/activites/labels", "admin:activites:manage"],
  ["PUT", "/api/activites/groupes/[code]", "admin:activites:manage"],
  ["PUT", "/api/especes-protegees/modifications/[cd_ref]", "admin:especes:manage"],
  ["DELETE", "/api/especes-protegees/modifications/[cd_ref]", "admin:especes:manage"],
  ["POST", "/api/changelog", "admin:changelog:create"],
  ["GET", "/changelog/nouveau", "admin:changelog:create"],
  ["PUT", "/api/changelog/[id]", "admin:changelog:update"],
  ["DELETE", "/api/changelog/[id]", "admin:changelog:delete"],
  ["POST", "/api/changelog/[id]/media", "admin:changelog:update"],
  ["DELETE", "/api/changelog/[id]/media", "admin:changelog:update"],
  ["POST", "/api/synchronisation-dn", "admin:sync:run"],
  ["POST", "/api/users", "users:manage"],
  ["POST", "/utilisateurs", "users:manage"],
  ["POST", "/api/groupes-instructeurs", "groups:manage"],
  ["POST", "/groupes-instructeurs", "groups:manage"],
];
describe("admin write permissions", () => {
  it.each(cases)("%s %s requires %s and admin access", (method, path, permission) => {
    expect(canAccessAdminRoute(path, method, ["admin:access", permission])).toBe(true);
    expect(canAccessAdminRoute(path, method, [permission])).toBe(false);
    expect(
      canAccessAdminRoute(
        path,
        method,
        BUNDLES.administrateur.filter((p) => p !== permission),
      ),
    ).toBe(false);
  });
  it("denies unlisted writes even for administrators", () => {
    expect(canAccessAdminRoute(null, "POST", BUNDLES.administrateur)).toBe(false);
    expect(canAccessAdminRoute("/api/future-feature", "POST", BUNDLES.administrateur)).toBe(false);
    expect(canAccessAdminRoute("/api/dossiers/[dossierId]", "PATCH", BUNDLES.administrateur)).toBe(
      false,
    );
  });
  it("retains read access without giving write access", () => {
    expect(canAccessAdminRoute("/api/dossiers/[dossierId]", "GET", ["admin:access"])).toBe(true);
    expect(canAccessAdminRoute("/utilisateurs", "GET", ["admin:access"])).toBe(false);
    expect(canAccessAdminRoute("/groupes-instructeurs", "GET", ["admin:access"])).toBe(false);
  });
  it("permits uploading only for actions that consume uploads", () => {
    expect(
      canAccessAdminRoute("/api/fichiers/upload-url", "POST", [
        "admin:access",
        "admin:dossiers:files",
      ]),
    ).toBe(true);
    expect(
      canAccessAdminRoute("/api/fichiers/upload-url", "POST", [
        "admin:access",
        "admin:dossiers:update",
      ]),
    ).toBe(false);
    expect(
      canAccessAdminRoute("/api/dossiers/[dossierId]/pieces-jointes", "POST", [
        "admin:access",
        "admin:changelog:update",
      ]),
    ).toBe(false);
  });
});
