import { describe, expect, it } from "vitest";
import { BUNDLES, type Permission } from "@pitchou/types/permissions.ts";
import { canAccessAdminRoute } from "./permissions.ts";

const cases: [string, string, Permission][] = [
  ["POST", "/api/dossiers", "admin:dossiers:create"],
  ["POST", "/api/dossiers/minimal", "admin:dossiers:create"],
  ["PUT", "/api/dossiers/123", "admin:dossiers:update"],
  ["DELETE", "/api/dossiers/123", "admin:dossiers:delete"],
  ["POST", "/api/dossiers/123/pieces-jointes", "admin:dossiers:files"],
  ["DELETE", "/api/dossiers/123/pieces-jointes/456", "admin:dossiers:files"],
  ["POST", "/api/dossiers/123/especes-impactees", "admin:dossiers:species"],
  ["DELETE", "/api/dossiers/123/especes-impactees", "admin:dossiers:species"],
  ["POST", "/api/dossiers/123/simuler-synchronisation", "admin:sync:simulate"],
  ["POST", "/api/activites", "admin:activites:manage"],
  ["PUT", "/api/activites/A", "admin:activites:manage"],
  ["PUT", "/api/activites/labels", "admin:activites:manage"],
  ["PUT", "/api/activites/groupes/A", "admin:activites:manage"],
  ["PUT", "/api/especes-protegees/modifications/123", "admin:especes:manage"],
  ["DELETE", "/api/especes-protegees/modifications/123", "admin:especes:manage"],
  ["POST", "/api/changelog", "admin:changelog:create"],
  ["PUT", "/api/changelog/123", "admin:changelog:update"],
  ["DELETE", "/api/changelog/123", "admin:changelog:delete"],
  ["POST", "/api/changelog/123/media", "admin:changelog:update"],
  ["DELETE", "/api/changelog/123/media", "admin:changelog:update"],
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
    expect(canAccessAdminRoute("/api/future-feature", "POST", BUNDLES.administrateur)).toBe(false);
    expect(canAccessAdminRoute("/api/dossiers/123", "PATCH", BUNDLES.administrateur)).toBe(false);
  });
  it("retains read access without giving write access", () => {
    expect(canAccessAdminRoute("/api/dossiers/123", "GET", ["admin:access"])).toBe(true);
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
      canAccessAdminRoute("/api/dossiers/123/pieces-jointes", "POST", [
        "admin:access",
        "admin:changelog:update",
      ]),
    ).toBe(false);
  });
});
