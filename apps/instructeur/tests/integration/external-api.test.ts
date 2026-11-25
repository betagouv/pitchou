import { expect, test } from "vitest";
import {
  admitExternalApiRequest,
  externalApiRequestsPerMinute,
  readExternalDossierStatus,
} from "@pitchou/server/database/externalApi.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createGroupeInstructeurs,
} from "../factories/dossier.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

const scope = "dossiers:read:statut";
const limitedClient = { kind: "service", clientId: "limited-client" } as const;
const otherClient = { kind: "service", clientId: "other-client" } as const;

test("filters status reads by scope, client, direct grants and active group assignments", async () => {
  const direct = await createDossier(db);
  const assigned = await createDossier(db);
  const other = await createDossier(db);
  const groupe = await createGroupeInstructeurs(db);
  await attachDossierToGroupe(db, assigned.id, groupe.id);
  await db("external_api_client").insert([
    { client_id: "limited-client", enabled: true, allow_oauth: true },
    { client_id: "other-client", enabled: true, allow_oauth: true },
  ]);
  await db("external_api_dossier_grant").insert({
    client_id: "limited-client",
    scope,
    dossier: direct.id,
  });
  await db("external_api_groupe_grant").insert({
    client_id: "limited-client",
    scope,
    groupe_instructeurs: groupe.id,
  });
  const timestamp = new Date("2026-11-20T14:00:00Z");
  await db("evenement_phase_dossier").insert([
    { dossier: direct.id, phase: "Instruction", timestamp },
    { dossier: direct.id, phase: "Contrôle", timestamp },
  ]);

  expect(await readExternalDossierStatus(limitedClient, scope, direct.id, db)).toEqual({
    id: direct.id,
    phase: "Contrôle",
    timestamp,
  });
  expect(await readExternalDossierStatus(limitedClient, scope, assigned.id, db)).toEqual({
    id: assigned.id,
    phase: null,
    timestamp: null,
  });
  expect(await readExternalDossierStatus(limitedClient, scope, other.id, db)).toBeUndefined();
  expect(await readExternalDossierStatus(otherClient, scope, direct.id, db)).toBeUndefined();
  expect(
    await readExternalDossierStatus(limitedClient, "other:scope", direct.id, db),
  ).toBeUndefined();

  await db("groupe_instructeurs").where({ id: groupe.id }).update({ active: false });
  expect(await readExternalDossierStatus(limitedClient, scope, assigned.id, db)).toBeUndefined();
  await db("external_api_client").where({ client_id: "limited-client" }).update({ enabled: false });
  expect(await readExternalDossierStatus(limitedClient, scope, direct.id, db)).toBeUndefined();
  expect(await admitExternalApiRequest("limited-client", db)).toBe("disabled");
});

test("admits requests atomically across connections and resets the previous minute", async () => {
  await db("external_api_client").insert({ client_id: "quota-client", enabled: true });
  // Lock in one request remaining until the database's next minute boundary.
  // Compare clock buckets for the assertions if the boundary falls during this test.
  const [before] = await db("external_api_client")
    .where({ client_id: "quota-client" })
    .update({
      rate_window_start: db.raw("date_trunc('minute', statement_timestamp())"),
      requests_this_minute: externalApiRequestsPerMinute - 1,
    })
    .returning("rate_window_start");
  const results = await Promise.all(
    Array.from({ length: 8 }, () => admitExternalApiRequest("quota-client", db)),
  );
  const after = await db("external_api_client").where({ client_id: "quota-client" }).first();
  if (before.rate_window_start.getTime() === after.rate_window_start.getTime()) {
    expect(results.filter((result) => result === "admitted")).toHaveLength(1);
    expect(results.filter((result) => result === "limited")).toHaveLength(7);
  } else {
    expect(results.filter((result) => result === "admitted").length).toBeGreaterThan(1);
    expect(results).not.toContain("disabled");
  }
  await db("external_api_client")
    .where({ client_id: "quota-client" })
    .update({
      rate_window_start: db.raw(
        "date_trunc('minute', statement_timestamp()) - interval '1 minute'",
      ),
      requests_this_minute: externalApiRequestsPerMinute,
    });
  expect(await admitExternalApiRequest("quota-client", db)).toBe("admitted");
  expect(await admitExternalApiRequest("unregistered-client", db)).toBe("disabled");
});

test("serves the OpenAPI contract and Swagger assets without a browser session", async () => {
  const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/openapi.json`);
  expect(response.status).toBe(200);
  const contract = await response.json();
  expect(contract.paths["/dossiers/{id}/statut"].get.operationId).toBe("getDossierStatut");

  const documentation = await fetch(`${INTEGRATION_BASE_URL}/api/v1/docs`);
  expect(documentation.status).toBe(200);
  expect(documentation.headers.get("Content-Security-Policy")).toContain("connect-src 'self'");
  const html = await documentation.text();
  expect(html).toContain("supportedSubmitMethods: []");
  const assets = [...html.matchAll(/(?:src|href)="([^"]*swagger-ui[^" ]+)"/gu)];
  expect(assets).toHaveLength(2);
  for (const [_, asset] of assets) {
    const result = await fetch(new URL(asset, INTEGRATION_BASE_URL));
    expect(result.status, asset).toBe(200);
    expect(result.headers.get("Content-Type"), asset).toMatch(/javascript|text\/css/u);
    await result.arrayBuffer();
  }
});

test.each(["/api/v1/dossiers/1/statut", "/%61pi/v1/dossiers/1/statut"])(
  "returns an API challenge rather than a browser login at %s",
  async (path) => {
    const response = await fetch(INTEGRATION_BASE_URL + path, {
      headers: { Accept: "text/html" },
      redirect: "manual",
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
  },
);
