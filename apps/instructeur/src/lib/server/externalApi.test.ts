import type { Handle } from "@sveltejs/kit/hooks";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { admitExternalApiRequest } from "@pitchou/server/database/externalApi.ts";
import { withExternalDossier } from "@pitchou/server/database/externalApi/access.ts";
import { dossierReadScope as scope } from "@pitchou/types/externalApi.ts";
import { GET } from "../../routes/api/v1/dossiers/[id]/+server.ts";
import { handleExternalApi } from "./externalApi.ts";

vi.mock("@pitchou/server/database/externalApi.ts", () => ({
  admitExternalApiRequest: vi.fn(),
}));

const issuer = "https://oauth.pitchou.example";
const audience = "https://api.pitchou.example";
vi.mock("@pitchou/server/database/externalApi/access.ts", () => ({ withExternalDossier: vi.fn() }));
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
  vi.mocked(withExternalDossier).mockResolvedValue(undefined);
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

function callDossier(token?: string, id = "123") {
  const url = new URL(`/api/v1/dossiers/${id}`, audience);
  const headers = new Headers({ Accept: "text/html", Cookie: "pitchou_session=browser-session" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const event = {
    params: { id },
    locals: { user: null },
    route: { id: "/api/v1/dossiers/[id]" },
    request: new Request(url, { headers }),
    url,
  } as Parameters<Handle>[0]["event"];
  return handleExternalApi({
    event,
    resolve: () => Promise.resolve(GET(event as Parameters<typeof GET>[0])),
  });
}

test("ignores browser authentication and returns a Bearer challenge", async () => {
  const response = await callDossier();
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
  expect(response.headers.get("Location")).toBeNull();
  expect(response.headers.get("Content-Type")).toBe("application/problem+json");
  expect(admitExternalApiRequest).not.toHaveBeenCalled();
});

test("rejects JWT credentials when OAuth is disabled", async () => {
  vi.stubEnv("EXTERNAL_API_ISSUER", "");
  vi.stubEnv("EXTERNAL_API_AUDIENCE", "");
  vi.stubEnv("EXTERNAL_API_JWKS_URL", "");
  const response = await callDossier(await signToken());
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toContain('error="invalid_token"');
  expect(admitExternalApiRequest).not.toHaveBeenCalled();
});

test("reports an unavailable verifier when OAuth is only partially configured", async () => {
  vi.stubEnv("EXTERNAL_API_JWKS_URL", "");
  const response = await callDossier(await signToken());
  expect(response.status).toBe(503);
  expect(admitExternalApiRequest).not.toHaveBeenCalled();
});

test.each(["not-json", JSON.stringify({ alg: "ES256", crit: ["unexpected"], unexpected: true })])(
  "rejects an invalid or unsupported protected header before looking up keys",
  async (header) => {
    const encoded = Buffer.from(header).toString("base64url");
    const response = await callDossier(`${encoded}.e30.c2ln`);
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer error="invalid_token"');
    expect(fetch).not.toHaveBeenCalled();
    expect(admitExternalApiRequest).not.toHaveBeenCalled();
  },
);

test.each([
  ["another audience", { aud: "https://another-api.example" }, "at+jwt"],
  ["another issuer", { iss: "https://another-issuer.example" }, "at+jwt"],
  ["a human subject", { sub: "personne" }, "at+jwt"],
  ["an ID token", {}, "JWT"],
  ["an expired token", { iat: 1, exp: 2 }, "at+jwt"],
])("rejects a signed token with %s", async (_case, claims, typ) => {
  const response = await callDossier(await signToken(claims, typ));
  expect(response.status).toBe(401);
  expect(admitExternalApiRequest).not.toHaveBeenCalled();
});

test("requires the operation scope and validates the dossier ID before its query", async () => {
  const response = await callDossier(await signToken({ scope: "dossiers:read:other" }));
  expect(response.status).toBe(403);
  expect(response.headers.get("WWW-Authenticate")).toContain('error="insufficient_scope"');
  expect((await callDossier(await signToken(), "2147483648")).status).toBe(400);
  expect(withExternalDossier).not.toHaveBeenCalled();
});

test("checks dossier grants and revocation for each call with the same token", async () => {
  const token = await signToken();
  const missing = await callDossier(token);
  expect(missing.status).toBe(404);
  const timestamp = new Date("2026-11-20T11:24:00Z");
  const dossier = { id: 123, status: "instruction", status_changed_at: timestamp.toISOString() };
  vi.mocked(withExternalDossier).mockResolvedValue(dossier);
  const response = await callDossier(token);
  expect(withExternalDossier).toHaveBeenLastCalledWith(
    { kind: "service", clientId, scopes: new Set([scope]) },
    123,
    expect.any(Function),
    expect.any(Function),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Request-Id")).toMatch(/^[\da-f-]{36}$/u);
  expect(await response.json()).toEqual(dossier);
  expect(console.info).toHaveBeenCalledWith(
    expect.stringContaining('"clientId":"partenaire-test"'),
  );
  expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining(token));

  vi.mocked(admitExternalApiRequest).mockResolvedValue("disabled");
  expect((await callDossier(token)).status).toBe(401);
  expect(withExternalDossier).toHaveBeenCalledTimes(2);
});

test("returns retry guidance when the shared per-client quota is exhausted", async () => {
  vi.mocked(admitExternalApiRequest).mockResolvedValue("limited");
  const response = await callDossier(await signToken());
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(withExternalDossier).not.toHaveBeenCalled();
});
