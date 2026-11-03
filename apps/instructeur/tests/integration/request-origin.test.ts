import { expect, test } from "vitest";
import { ADMIN_BASE_URL, INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { admin } from "../helpers/administration.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { db } from "../setup/db.ts";

test.each([
  {
    app: "admin",
    base: ADMIN_BASE_URL,
    sibling: INTEGRATION_BASE_URL,
    path: "/api/groupes-instructeurs/apercu",
  },
  {
    app: "instructeur",
    base: INTEGRATION_BASE_URL,
    sibling: ADMIN_BASE_URL,
    path: "/api/metriques/evenements",
  },
])(
  "$app uses its built origin and rejects the other app and runtime overrides",
  async ({ app, base, sibling, path }) => {
    const token =
      app === "admin" ? (await admin()).token : (await createInstructeurWithDossier(db)).cap;
    for (const contentType of ["application/json", "application/x-www-form-urlencoded"]) {
      for (const origin of [
        base,
        sibling,
        "https://runtime-origin.invalid",
        "https://runtime-admin.invalid",
        "https://runtime-instructeur.invalid",
        "https://foreign.invalid",
        "null",
        undefined,
      ]) {
        const headers = new Headers({
          cookie: `pitchou_session=${token}`,
          "content-type": contentType,
          "x-forwarded-host": new URL(base).host,
          "x-forwarded-proto": new URL(base).protocol.slice(0, -1),
        });
        if (origin !== undefined) headers.set("origin", origin);
        const response = await fetch(`${base}${path}`, { method: "POST", headers, body: "{}" });
        // A valid origin reaches payload validation; invalid origins never reach the route.
        expect(response.status, `${contentType} with origin ${origin}`).toBe(
          origin === base ? 400 : 403,
        );
      }
    }
  },
);
