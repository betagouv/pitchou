import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createSession } from "@pitchou/server/session.ts";
import { ADMIN_BASE_URL, INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";

test.each([
  ["/docs/style/dsfr/dsfr.css", "text/css"],
  ["/docs/style/dsfr/utility/utility.css", "text/css"],
  ["/docs/style/dsfr/dsfr.module.js", "javascript"],
])(
  "anonymous admin asset %s returns its content without a login redirect",
  async (path, contentType) => {
    for (const method of ["GET", "HEAD"]) {
      const response = await fetch(ADMIN_BASE_URL + path, { method, redirect: "manual" });
      expect(response.status).toBe(200);
      expect(response.headers.has("location")).toBe(false);
      expect(response.headers.get("content-type")).toContain(contentType);
      expect(response.headers.get("set-cookie")).toBeNull();
      const body = await response.text();
      if (method === "GET") expect(body.length).toBeGreaterThan(0);
      else expect(body).toBe("");
    }
  },
);

test("resolved admin routes enforce read permissions for encoded URLs and page data", async () => {
  const [user] = await db("auth_user").insert({ email: "reader@test.fr" }).returning("*");
  await db("auth_permission").insert({ user_id: user.id, permission: "admin:access" });
  const token = await createSession(
    { userId: user.id, email: user.email, name: "Reader", idToken: null },
    db,
  );
  const paths = [
    "/api/users",
    "/api/%75sers",
    "/%61pi/users",
    "/api/u%73ers",
    "/utilisateurs",
    "/%75tilisateurs",
    "/utilisat%65urs",
    "/utilisateurs/__data.json",
    "/%75tilisateurs/__data.json",
    "/groupes-instructeurs",
    "/%67roupes-instructeurs",
    "/groupes%2dinstructeurs",
    "/groupes-instructeurs/__data.json",
    "/%67roupes-instructeurs/__data.json",
  ];
  for (const path of paths) {
    for (const method of ["GET", "HEAD"]) {
      const response = await fetchAuthenticated(token, ADMIN_BASE_URL + path, {
        method,
        redirect: "manual",
      });
      expect(response.status, `${method} ${path}`).toBe(403);
    }
  }
  for (const path of ["/dossiers/nouveau", "/dossiers/%6eouveau", "/changelog/%6eouveau"]) {
    expect((await fetchAuthenticated(token, ADMIN_BASE_URL + path)).status, path).toBe(403);
  }
  await db("auth_permission").insert([
    { user_id: user.id, permission: "users:manage" },
    { user_id: user.id, permission: "groups:manage" },
  ]);
  for (const path of paths) {
    const response = await fetchAuthenticated(token, ADMIN_BASE_URL + path, { redirect: "manual" });
    expect(response.status, path).toBe(200);
  }
});

test("access-denied pages load without redirecting or issuing a session", async () => {
  const response = await fetch(INTEGRATION_BASE_URL + "/auth/acces-refuse?reason=disabled", {
    redirect: "manual",
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toBeNull();
  const data = await fetch(INTEGRATION_BASE_URL + "/auth/acces-refuse/__data.json?reason=disabled");
  expect(data.status).toBe(200);
  expect((await data.json()).type).toBe("data");
  expect(data.headers.get("set-cookie")).toBeNull();
  expect(await db("session")).toHaveLength(0);
});
