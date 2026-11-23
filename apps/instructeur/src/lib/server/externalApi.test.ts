import type { Handle } from "@sveltejs/kit/hooks";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  admitExternalApiRequest,
  readExternalDossierStatus,
} from "@pitchou/server/database/externalApi.ts";
import { GET } from "../../routes/api/v1/dossiers/[id]/statut/+server.ts";
import { handleExternalApi } from "./externalApi.ts";
import openApi from "./externalApi/openapi.json";

vi.mock("@pitchou/server/database/externalApi.ts", () => ({
  admitExternalApiRequest: vi.fn(),
  readExternalDossierStatus: vi.fn(),
}));

const issuer = "https://oauth.pitchou.example";
const audience = "https://api.pitchou.example";
const scope = "dossiers:read:statut";
const clientId = "partenaire-test";
const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
const jwk = { ...(await exportJWK(publicKey)), kid: "test-key" };

beforeEach(() => {
  vi.stubEnv("EXTERNAL_API_ISSUER", issuer);
  vi.stubEnv("EXTERNAL_API_AUDIENCE", audience);
  vi.stubEnv("EXTERNAL_API_JWKS_URL", `${issuer}/jwks`);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json({ keys: [jwk] }))),
  );
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.mocked(admitExternalApiRequest).mockResolvedValue("admitted");
  vi.mocked(readExternalDossierStatus).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function signToken(claims: JWTPayload = {}, typ = "at+jwt") {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: issuer,
    aud: audience,
    sub: clientId,
    client_id: clientId,
    scope,
    iat: now,
    exp: now + 120,
    jti: "test-token",
    ...claims,
  })
    .setProtectedHeader({ typ, alg: "ES256", kid: jwk.kid })
    .sign(privateKey);
}

function callStatus(token?: string, id = "123") {
  const url = new URL(`/api/v1/dossiers/${id}/statut`, audience);
  const headers = new Headers({ Accept: "text/html", Cookie: "pitchou_session=browser-session" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const event = {
    params: { id },
    locals: { user: null },
    route: { id: "/api/v1/dossiers/[id]/statut" },
    request: new Request(url, { headers }),
    url,
  } as Parameters<Handle>[0]["event"];
  return handleExternalApi({
    event,
    resolve: () => Promise.resolve(GET(event as Parameters<typeof GET>[0])),
  });
}

test("ignores browser authentication and returns a Bearer challenge", async () => {
  const response = await callStatus();
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
  expect(response.headers.get("Location")).toBeNull();
  expect(response.headers.get("Content-Type")).toBe("application/problem+json");
  expect(admitExternalApiRequest).not.toHaveBeenCalled();
});

test.each([
  ["another audience", { aud: "https://another-api.example" }, "at+jwt"],
  ["another issuer", { iss: "https://another-issuer.example" }, "at+jwt"],
  ["a human subject", { sub: "personne" }, "at+jwt"],
  ["an ID token", {}, "JWT"],
  ["an expired token", { iat: 1, exp: 2 }, "at+jwt"],
])("rejects a signed token with %s", async (_case, claims, typ) => {
  const response = await callStatus(await signToken(claims, typ));
  expect(response.status).toBe(401);
  expect(admitExternalApiRequest).not.toHaveBeenCalled();
});

test("requires the operation scope and validates the dossier ID before its query", async () => {
  const response = await callStatus(await signToken({ scope: "dossiers:read:statut:other" }));
  expect(response.status).toBe(403);
  expect(response.headers.get("WWW-Authenticate")).toContain('error="insufficient_scope"');
  expect((await callStatus(await signToken(), "2147483648")).status).toBe(400);
  expect(readExternalDossierStatus).not.toHaveBeenCalled();
});

test("checks dossier status grants and revocation for each call with the same token", async () => {
  const token = await signToken();
  const missing = await callStatus(token);
  expect(missing.status).toBe(404);
  const timestamp = new Date("2026-11-20T11:24:00Z");
  vi.mocked(readExternalDossierStatus).mockResolvedValue({
    id: 123,
    phase: "Instruction",
    timestamp,
  });
  const response = await callStatus(token);
  expect(readExternalDossierStatus).toHaveBeenLastCalledWith(clientId, scope, 123);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Request-Id")).toMatch(/^[\da-f-]{36}$/u);
  const body = await response.json();
  const schema = openApi.components.schemas.DossierStatut;
  expect(Object.keys(body).sort()).toEqual([...schema.required].sort());
  expect(schema.properties.statut.enum).toContain(body.statut);
  expect(body).toEqual({
    id: 123,
    statut: "instruction",
    date_changement_statut: timestamp.toISOString(),
  });
  expect(console.info).toHaveBeenCalledWith(
    expect.stringContaining('"clientId":"partenaire-test"'),
  );
  expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining(token));

  vi.mocked(admitExternalApiRequest).mockResolvedValue("disabled");
  expect((await callStatus(token)).status).toBe(401);
  expect(readExternalDossierStatus).toHaveBeenCalledTimes(2);
});

test("returns retry guidance when the shared per-client quota is exhausted", async () => {
  vi.mocked(admitExternalApiRequest).mockResolvedValue("limited");
  const response = await callStatus(await signToken());
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(readExternalDossierStatus).not.toHaveBeenCalled();
});
